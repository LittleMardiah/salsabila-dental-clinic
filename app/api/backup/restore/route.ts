// app/api/backup/restore/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'
import { resolveAdminAccessCode } from '@/lib/admin-auth'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { sanitizeAdminPreferences } from '@/lib/backup-sanitize'

const MAX_RESTORE_ZIP_BYTES = 200 * 1024 * 1024
const MAX_UPLOAD_ENTRY_BYTES = 50 * 1024 * 1024
const MAX_UPLOAD_TOTAL_BYTES = 500 * 1024 * 1024

// Fungsi untuk membuat backup otomatis sebelum restore. Stored outside public/
// so clinical data and OAuth credentials are never reachable over HTTP.
async function createPreRestoreBackup(adminId: string): Promise<string> {
  const backupDir = path.join(os.tmpdir(), 'salsa-pre-restore')
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `pre-restore-${timestamp}.json`
  const filePath = path.join(backupDir, fileName)

  // Ambil semua data dari database
  const [
    patients,
    queues,
    medicalVisits,
    medicalPhotos,
    transactions,
    dailyReconciliations,
    auditLogs,
    adminPreferences,
    webPushSubscriptions,
  ] = await Promise.all([
    prisma.patient.findMany(),
    prisma.queue.findMany(),
    prisma.medicalVisit.findMany(),
    prisma.medicalPhoto.findMany(),
    prisma.transaction.findMany(),
    prisma.dailyReconciliation.findMany(),
    prisma.auditLog.findMany(),
    prisma.adminPreference.findMany(),
    prisma.webPushSubscription.findMany(),
  ])

  const backupData = {
    metadata: {
      version: '1.0',
      timestamp: new Date().toISOString(),
      exportedBy: adminId,
      type: 'pre-restore-auto',
    },
    data: {
      patients,
      queues,
      medicalVisits,
      medicalPhotos,
      transactions,
      dailyReconciliations,
      auditLogs,
      adminPreferences: sanitizeAdminPreferences(adminPreferences),
      webPushSubscriptions,
    },
  }

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), { mode: 0o600 })
  return filePath
}

export async function POST(request: Request) {
  try {
    // Verifikasi admin token
    const auth = await verifyAdminToken(request)
    if (!auth.valid) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    // Parse form data (file + kode)
    const formData = await request.formData()
    const code = formData.get('code')
    const backupFile = formData.get('backupFile')

    if (typeof code !== 'string' || code.length === 0 || code.length > 128) {
      return NextResponse.json({ success: false, error: 'Kode restore tidak valid' }, { status: 400 })
    }
    if (!backupFile || typeof (backupFile as File).arrayBuffer !== 'function') {
      return NextResponse.json({ success: false, error: 'File backup tidak ditemukan' }, { status: 400 })
    }
    if ((backupFile as File).size === 0 || (backupFile as File).size > MAX_RESTORE_ZIP_BYTES) {
      return NextResponse.json({ success: false, error: 'Ukuran file backup tidak valid' }, { status: 413 })
    }

    // Validasi kode 8 digit (bandingkan dengan ADMIN_ACCESS_CODE)
    const adminAccessCode = resolveAdminAccessCode()
    if (!adminAccessCode) {
      return NextResponse.json({ success: false, error: 'Konfigurasi server error' }, { status: 503 })
    }
    let isValidCode = false
    if (adminAccessCode.startsWith('$2')) {
      const bcrypt = await import('bcrypt')
      isValidCode = await bcrypt.compare(code, adminAccessCode)
    } else {
      isValidCode = code === adminAccessCode
    }
    if (!isValidCode) {
      return NextResponse.json({ success: false, error: 'Kode restore tidak valid' }, { status: 401 })
    }

    // Baca file ZIP di memori. Jangan pernah extractAllTo(): entry dengan path
    // traversal/symlink dapat menulis di luar folder tujuan.
    const bytes = await (backupFile as File).arrayBuffer()
    const buffer = Buffer.from(bytes)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return NextResponse.json({ success: false, error: 'File backup bukan ZIP yang valid' }, { status: 400 })
    }

    const AdmZip = require('adm-zip')
    const zip = new AdmZip(buffer)
    const databaseEntry = zip.getEntry('database.json')
    if (!databaseEntry || databaseEntry.isDirectory) {
      return NextResponse.json(
        { success: false, error: 'File database.json tidak ditemukan dalam backup' },
        { status: 400 }
      )
    }
    const databaseSize = Number((databaseEntry.header as { size?: number }).size || 0)
    if (databaseSize > MAX_RESTORE_ZIP_BYTES) {
      return NextResponse.json({ success: false, error: 'File database terlalu besar' }, { status: 413 })
    }

    let backupData: { data?: any }
    try {
      backupData = JSON.parse(databaseEntry.getData().toString('utf-8'))
    } catch {
      return NextResponse.json({ success: false, error: 'Format backup tidak valid' }, { status: 400 })
    }
    if (!backupData.data) {
      return NextResponse.json(
        { success: false, error: 'Format backup tidak valid (missing data)' },
        { status: 400 }
      )
    }

    // Backup otomatis kondisi saat ini sebelum restore
    await createPreRestoreBackup(auth.username!)

    // Lakukan restore dalam transaksi
    await prisma.$transaction(async (tx) => {
      // Hapus semua data (urutan dari child ke parent)
      await tx.webPushSubscription.deleteMany()
      await tx.medicalPhoto.deleteMany()
      await tx.medicalVisit.deleteMany()
      await tx.transaction.deleteMany()
      await tx.dailyReconciliation.deleteMany()
      await tx.auditLog.deleteMany()
      await tx.queue.deleteMany()
      await tx.patient.deleteMany()
      await tx.adminPreference.deleteMany()

      // Insert data dari backup
      const {
        patients = [],
        queues = [],
        medicalVisits = [],
        medicalPhotos = [],
        transactions = [],
        dailyReconciliations = [],
        auditLogs = [],
        adminPreferences = [],
        webPushSubscriptions = [],
      } = backupData.data

      if (patients.length) await tx.patient.createMany({ data: patients })
      if (queues.length) await tx.queue.createMany({ data: queues })
      if (medicalVisits.length) await tx.medicalVisit.createMany({ data: medicalVisits })
      if (medicalPhotos.length) await tx.medicalPhoto.createMany({ data: medicalPhotos })
      if (transactions.length) await tx.transaction.createMany({ data: transactions })
      if (dailyReconciliations.length) await tx.dailyReconciliation.createMany({ data: dailyReconciliations })
      if (auditLogs.length) await tx.auditLog.createMany({ data: auditLogs })
      if (adminPreferences.length) await tx.adminPreference.createMany({ data: adminPreferences })
      if (webPushSubscriptions.length) await tx.webPushSubscription.createMany({ data: webPushSubscriptions })
    })

    // Restore file uploads (foto EMR, bukti transfer) dari folder uploads/ dalam ZIP.
    // Hanya entry dengan path yang tetap berada di dalam public/uploads yang ditulis.
    const uploadsDest = path.resolve(process.cwd(), 'public', 'uploads')
    if (fs.existsSync(uploadsDest)) {
      fs.rmSync(uploadsDest, { recursive: true, force: true })
    }
    fs.mkdirSync(uploadsDest, { recursive: true })

    let restoredBytes = 0
    for (const entry of zip.getEntries()) {
      const entryName = entry.entryName.replace(/\\/g, '/')
      if (entry.isDirectory || !entryName.startsWith('uploads/')) continue

      const entrySize = Number((entry.header as { size?: number }).size || 0)
      if (entrySize > MAX_UPLOAD_ENTRY_BYTES) continue
      if (restoredBytes + entrySize > MAX_UPLOAD_TOTAL_BYTES) break

      const relativePath = entryName.slice('uploads/'.length)
      if (!relativePath || relativePath.includes('\0')) continue

      const targetPath = path.resolve(uploadsDest, relativePath)
      if (!targetPath.startsWith(`${uploadsDest}${path.sep}`)) continue

      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.writeFileSync(targetPath, entry.getData(), { mode: 0o600 })
      restoredBytes += entrySize
    }

    // Catat log tanpa path server / isi backup.
    console.log(`[Restore] Admin ${auth.username} berhasil restore dari backup`)

    return NextResponse.json({
      success: true,
      message:
        'Database berhasil direstore dari backup. Backup otomatis sebelum restore disimpan di server.',
    })
  } catch (error) {
    console.error(
      'Restore error:',
      error instanceof Error ? error.message : 'unknown error'
    )
    return NextResponse.json({ success: false, error: 'Gagal restore' }, { status: 500 })
  }
}
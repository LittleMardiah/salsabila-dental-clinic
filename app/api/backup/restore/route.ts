// app/api/backup/restore/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { exec } from 'child_process'
import { promisify } from 'util'
const execAsync = promisify(exec)

// Fungsi untuk membuat backup otomatis sebelum restore
async function createPreRestoreBackup(adminId: string): Promise<string> {
  const backupDir = path.join(process.cwd(), 'public', 'temp-backups')
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
      adminPreferences,
      webPushSubscriptions,
    },
  }

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2))
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
    const code = formData.get('code') as string
    const backupFile = formData.get('backupFile') as File

    if (!backupFile) {
      return NextResponse.json({ success: false, error: 'File backup tidak ditemukan' }, { status: 400 })
    }

    // Validasi kode 8 digit (bandingkan dengan ADMIN_ACCESS_CODE)
    const adminAccessCode = process.env.ADMIN_ACCESS_CODE
    let isValidCode = false
    if (adminAccessCode) {
      if (adminAccessCode.startsWith('$2b$')) {
        const bcrypt = await import('bcrypt')
        isValidCode = await bcrypt.compare(code, adminAccessCode)
      } else {
        isValidCode = code === adminAccessCode
      }
    }
    if (!isValidCode) {
      return NextResponse.json({ success: false, error: 'Kode restore tidak valid' }, { status: 401 })
    }

    // Baca file backup yang diupload (ZIP)
    const bytes = await backupFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const tempZipPath = path.join(process.cwd(), 'public', 'temp', `${uuidv4()}.zip`)
    const extractDir = path.join(process.cwd(), 'public', 'temp', uuidv4())
    fs.mkdirSync(path.dirname(tempZipPath), { recursive: true })
    fs.writeFileSync(tempZipPath, buffer)

    // Ekstrak ZIP (gunakan command unzip atau library adm-zip)
    // Gunakan adm-zip (npm install adm-zip) atau built-in. Kita asumsikan sudah install adm-zip
    const AdmZip = require('adm-zip')
    const zip = new AdmZip(tempZipPath)
    zip.extractAllTo(extractDir, true)

    // Baca file database.json hasil ekstrak
    const jsonFilePath = path.join(extractDir, 'database.json')
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error('File database.json tidak ditemukan dalam backup')
    }
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8')
    const backupData = JSON.parse(jsonContent)
    if (!backupData.data) {
      throw new Error('Format backup tidak valid (missing data)')
    }

    // Backup otomatis kondisi saat ini sebelum restore
    const preRestoreBackupPath = await createPreRestoreBackup(auth.username!)

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

    // Restore file uploads (foto EMR, bukti transfer) dari folder uploads/ dalam ZIP
    const uploadsSource = path.join(extractDir, 'uploads')
    const uploadsDest = path.join(process.cwd(), 'public', 'uploads')
    if (fs.existsSync(uploadsSource)) {
      // Hapus folder uploads saat ini (opsional, bisa juga merge)
      // Hati-hati: folder uploads bisa besar, tapi untuk keamanan data lebih baik diganti total.
      if (fs.existsSync(uploadsDest)) {
        fs.rmSync(uploadsDest, { recursive: true, force: true })
      }
      fs.cpSync(uploadsSource, uploadsDest, { recursive: true })
    }

    // Bersihkan file temporary
    fs.unlinkSync(tempZipPath)
    fs.rmSync(extractDir, { recursive: true, force: true })
    // Biarkan pre-restore backup tetap ada (opsional, bisa dihapus nanti)

    // Catat log (opsional)
    console.log(`[Restore] Admin ${auth.username} berhasil restore dari backup, auto-backup disimpan di ${preRestoreBackupPath}`)

    return NextResponse.json({
      success: true,
      message: 'Database berhasil direstore dari backup. Backup otomatis sebelum restore disimpan di server.',
      autoBackupPath: preRestoreBackupPath,
    })
  } catch (error: any) {
    console.error('Restore error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Gagal restore' }, { status: 500 })
  }
}
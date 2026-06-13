export const dynamic = 'force-dynamic'

// app/api/backup/local/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'
import archiver from 'archiver'
import fs from 'fs'
import path from 'path'

/**
 * @openapi
 * /api/backup/local:
 *   get:
 *     summary: Download backup lokal (ZIP)
 *     description: Membuat file ZIP berisi seluruh database dan folder uploads, kemudian mengirimkannya sebagai file download.
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File ZIP berisi backup
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Tidak terautentikasi
 *       500:
 *         description: Gagal membuat backup
 */
export async function GET(request: Request) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // Ambil data dari database
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
      exportedBy: auth.username,
      totalRecords: {
        patients: patients.length,
        queues: queues.length,
        medicalVisits: medicalVisits.length,
        medicalPhotos: medicalPhotos.length,
        transactions: transactions.length,
        dailyReconciliations: dailyReconciliations.length,
        auditLogs: auditLogs.length,
        adminPreferences: adminPreferences.length,
        webPushSubscriptions: webPushSubscriptions.length,
      },
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

  const jsonString = JSON.stringify(backupData, null, 2)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const zipFileName = `backup-${timestamp}.zip`

  // Buat ZIP stream
  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.append(jsonString, { name: 'database.json' })

  // Tambahkan folder uploads jika ada
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  if (fs.existsSync(uploadsDir)) {
    archive.directory(uploadsDir, 'uploads')
  } else {
    console.warn('Folder uploads tidak ditemukan:', uploadsDir)
  }

  // Set header response
  const headers = new Headers()
  headers.set('Content-Type', 'application/zip')
  headers.set('Content-Disposition', `attachment; filename="${zipFileName}"`)

  // Return stream response dengan ReadableStream
  const stream = new ReadableStream({
    start(controller) {
      archive.on('data', (chunk: Buffer) => controller.enqueue(chunk))
      archive.on('end', () => controller.close())
      archive.on('error', (err: Error) => controller.error(err))
      archive.finalize()
    }
  })

  return new NextResponse(stream, {
    status: 200,
    headers,
  })
}
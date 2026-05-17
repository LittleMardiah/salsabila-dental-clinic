import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'
import archiver from 'archiver'
import fs from 'fs'
import path from 'path'

/**
 * @openapi
 * /api/backup/cloud:
 *   post:
 *     summary: Upload backup ke Google Drive
 *     description: Membuat file ZIP berisi seluruh database dan folder uploads, lalu menguploadnya ke Google Drive pengguna (memerlukan koneksi OAuth terlebih dahulu).
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup berhasil diupload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 fileId:
 *                   type: string
 *                 fileName:
 *                   type: string
 *       400:
 *         description: Google Drive belum terhubung
 *       401:
 *         description: Token tidak valid atau expired
 *       500:
 *         description: Gagal upload ke Google Drive
 */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  const data = await response.json()
  return data.access_token || null
}

export async function POST(request: Request) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const pref = await prisma.adminPreference.findUnique({
    where: { adminId: auth.username! },
  })

  if (!pref || !pref.googleAccessToken) {
    return NextResponse.json({ error: 'Google Drive not connected' }, { status: 400 })
  }

  let accessToken = pref.googleAccessToken
  if (pref.googleTokenExpiry && new Date() > pref.googleTokenExpiry) {
    const newToken = await refreshAccessToken(pref.googleRefreshToken!)
    if (!newToken) {
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 })
    }
    accessToken = newToken
    await prisma.adminPreference.update({
      where: { adminId: auth.username! },
      data: {
        googleAccessToken: newToken,
        googleTokenExpiry: new Date(Date.now() + 3600 * 1000),
      },
    })
  }

  // Ambil data database
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

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  if (fs.existsSync(uploadsDir)) {
    archive.directory(uploadsDir, 'uploads')
  }

  // Kumpulkan buffer dari archive
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    archive.on('data', (chunk: Buffer) => chunks.push(chunk))
    archive.on('end', () => resolve())
    archive.on('error', (err: Error) => reject(err))
    archive.finalize()
  })

  const zipBuffer = Buffer.concat(chunks)

  // Upload ke Google Drive dengan multipart
  const boundary = '-------314159265358979323846'
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--\r\n`

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify({ name: zipFileName, parents: ['root'] }) +
    delimiter +
    'Content-Type: application/zip\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    zipBuffer.toString('base64') +
    closeDelimiter

  const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  })

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    console.error('Google Drive upload error:', uploadResponse.status, errorText)
    return NextResponse.json({ error: `Upload failed: ${uploadResponse.status}` }, { status: 500 })
  }

  const result = await uploadResponse.json()
  return NextResponse.json({
    success: true,
    message: 'Backup uploaded to Google Drive',
    fileId: result.id,
    fileName: zipFileName,
  })
}
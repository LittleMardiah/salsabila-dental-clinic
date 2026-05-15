import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'
import { google } from 'googleapis'

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

  // Ambil token dari database
  const pref = await prisma.adminPreference.findUnique({
    where: { adminId: auth.username! },
  })
  if (!pref || !pref.googleAccessToken) {
    return NextResponse.json({ error: 'Google Drive not connected' }, { status: 400 })
  }

  let accessToken = pref.googleAccessToken
  // Jika token expired, refresh
  if (pref.googleTokenExpiry && new Date() > pref.googleTokenExpiry) {
    const newToken = await refreshAccessToken(pref.googleRefreshToken!)
    if (!newToken) {
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 })
    }
    accessToken = newToken
    await prisma.adminPreference.update({
      where: { adminId: auth.username! },
      data: { googleAccessToken: newToken, googleTokenExpiry: new Date(Date.now() + 3600 * 1000) },
    })
  }

  // Generate backup data (sama seperti local backup)
  const [patients, queues, medicalVisits, medicalPhotos, transactions, dailyReconciliations, auditLogs, adminPreferences, webPushSubscriptions] = await Promise.all([
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
  const fileName = `backup-${new Date().toISOString().split('T')[0]}.json`

  // Upload ke Google Drive
  const authDrive = new google.auth.OAuth2()
  authDrive.setCredentials({ access_token: accessToken })
  const drive = google.drive({ version: 'v3', auth: authDrive })

  const fileMetadata = {
    name: fileName,
    parents: ['root'], // bisa diganti dengan folder ID
  }
  const media = {
    mimeType: 'application/json',
    body: Buffer.from(jsonString, 'utf-8'),
  }

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id',
  })

  // Catat audit log
  // await addAuditLog(auth.username, 'BACKUP_CLOUD', 'backup', file.data.id, { fileName })

  return NextResponse.json({
    success: true,
    message: 'Backup uploaded to Google Drive',
    fileId: file.data.id,
    fileName,
  })
}
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'

export async function GET(request: Request) {
  // Verifikasi admin
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

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

  // Buat objek backup
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

  // 4. Konversi ke JSON string
  const jsonString = JSON.stringify(backupData, null, 2)
  const fileName = `backup-${new Date().toISOString().split('T')[0]}.json`

  // 5. Return response sebagai file attachment
  return new NextResponse(jsonString, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
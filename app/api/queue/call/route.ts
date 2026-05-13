import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/ServerAuth'
import { QueueStatus } from '@prisma/client'
import { sendNotification } from '@/lib/services/WebpushService'

export async function POST(request: Request) {
  // Log cookie header untuk debugging
  const cookieHeader = request.headers.get('cookie') || ''
  console.log('[CALL] Cookie header received:', cookieHeader)

  // Verifikasi token admin
  const authResult = await verifyAdminToken(request)
  if (!authResult.valid) {
    console.error('[CALL] Admin token invalid:', authResult.error)
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status || 401 }
    )
  }
  const adminUsername = authResult.username
  console.log(`[CALL] Admin ${adminUsername} calling next queue`)

  // Ambil queue WAITING teratas untuk hari ini
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const nextQueue = await prisma.queue.findFirst({
    where: {
      date: today,
      status: QueueStatus.WAITING,
    },
    orderBy: { queueNumber: 'asc' },
    include: {
      patient: true,
      webPushSubscription: true,
    },
  })

  if (!nextQueue) {
    return NextResponse.json(
      { success: false, error: 'No waiting queue available' },
      { status: 400 }
    )
  }

  let notificationSent = false
  try {
    // Update queue menjadi CALLED
    await prisma.queue.update({
      where: { id: nextQueue.id },
      data: {
        status: QueueStatus.CALLED,
        calledAt: new Date(),
      },
    })

    // Kirim notifikasi jika ada subscription
    if (nextQueue.webPushSubscription) {
      try {
        notificationSent = await sendNotification(
          nextQueue.id,
          nextQueue.patient.name,
          nextQueue.queueNumber
        )
      } catch (pushError) {
        console.error('Web push failed:', pushError)
        notificationSent = false
      }
    } else {
      console.log(`No web push subscription for queue ${nextQueue.id}`)
    }

    return NextResponse.json({
      success: true,
      called_queue: {
        id: nextQueue.id,
        queueNumber: nextQueue.queueNumber,
        patientName: nextQueue.patient.name,
      },
      notification_sent: notificationSent,
    })
  } catch (error) {
    console.error('Error calling queue:', error)
    return NextResponse.json(
      { success: false, error: 'Database error' },
      { status: 500 }
    )
  }
}
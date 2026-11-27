export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/ServerAuth'
import { sendNotification } from '@/lib/services/WebpushService'
import { addAuditLog } from '@/lib/services/audit.service'
import { clinicDateOnly } from '@/lib/clinic-date'

const callQueueSchema = z
  .object({
    queueId: z.number().int().positive().max(2_147_483_647),
  })
  .strict()

/**
 * @openapi
 * /api/queue/call:
 *   post:
 *     summary: Memanggil antrian berikutnya (mengubah status menjadi CALLED)
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Antrian berhasil dipanggil
 *       400:
 *         description: Tidak ada antrian menunggu
 *       401:
 *         description: Token admin tidak valid
 *       500:
 *         description: Gagal update database
 */

export async function POST(request: Request) {
  const authResult = await verifyAdminToken(request)
  if (!authResult.valid) {
    console.error('[CALL] Admin token invalid:', authResult.error)
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status || 401 }
    )
  }
  const adminUsername = authResult.username || 'unknown' 

  console.log(`[CALL] Admin ${adminUsername} calling next queue`)

  const today = clinicDateOnly()

  let requestedQueueId: number | null = null
  try {
    const body = await request.json()
    const parsed = callQueueSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'queueId tidak valid' },
        { status: 400 }
      )
    }
    requestedQueueId = parsed.data.queueId
  } catch {
    // No body: call the next waiting queue (legacy behaviour).
  }

  const nextQueue = await prisma.queue.findFirst({
    where: requestedQueueId
      ? { date: today, status: 'WAITING', id: requestedQueueId }
      : { date: today, status: 'WAITING' },
    orderBy: { queueNumber: 'asc' },
    include: { patient: true, webPushSubscription: true },
  })

  if (!nextQueue) {
    return NextResponse.json({ success: false, error: 'No waiting queue available' }, { status: 400 })
  }

  let notificationSent = false
  try {
    await prisma.queue.update({
      where: { id: nextQueue.id },
      data: { status: 'CALLED', calledAt: new Date() },
    })

    if (nextQueue.webPushSubscription) {
      try {
        notificationSent = await sendNotification(nextQueue.id, nextQueue.patient.name, nextQueue.queueNumber)
      } catch (pushError) {
        console.error('Web push failed:', pushError)
        notificationSent = false
      }
    } else {
      console.log(`No web push subscription for queue ${nextQueue.id}`)
    }

    await addAuditLog(
      adminUsername,
      'CALL_QUEUE',
      'queue',
      nextQueue.id.toString(),
      { queueNumber: nextQueue.queueNumber, patientName: nextQueue.patient.name },
      request.headers.get('x-forwarded-for') || 'unknown'
    )

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
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 })
  }
}
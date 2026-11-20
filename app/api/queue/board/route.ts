export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPatientToken } from '@/lib/middleware/auth'

/**
 * @openapi
 * /api/queue/board:
 *   get:
 *     summary: Mendapatkan informasi papan antrian untuk pasien (posisi, antrian dipanggil, dll)
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data papan antrian berhasil diambil
 *       401:
 *         description: Token pasien tidak valid
 *       404:
 *         description: Antrian tidak ditemukan
 */

export async function GET(request: Request) {
  const auth = await verifyPatientToken(request)
  if (!auth.valid) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 401 })
  }
  const queueId = auth.queueId!

  const myQueue = await prisma.queue.findUnique({
    where: { id: queueId },
    include: { patient: true }
  })
  if (!myQueue) {
    return NextResponse.json({ success: false, error: 'Queue not found' }, { status: 404 })
  }

  // Follow the patient's own queue date so a token that spans midnight keeps
  // showing the correct board instead of an empty "today".
  const boardDate = myQueue.date

  const currentCalled = await prisma.queue.findFirst({
    where: {
      date: boardDate,
      status: 'CALLED',
      calledAt: { not: null }
    },
    orderBy: { calledAt: 'desc' },
    include: { patient: true }
  })

  const nextQueues = await prisma.queue.findMany({
    where: {
      date: boardDate,
      status: 'WAITING',
      queueNumber: { gt: myQueue.queueNumber }
    },
    orderBy: { queueNumber: 'asc' },
    take: 5,
    include: { patient: true }
  })

  const totalToday = await prisma.queue.count({
    where: { date: boardDate }
  })

  const position = await prisma.queue.count({
    where: {
      date: boardDate,
      status: 'WAITING',
      queueNumber: { lt: myQueue.queueNumber }
    }
  }) + 1

  // Exactly one neighbour before and after the patient (no wait-time estimate).
  const [prevQueue, nextQueue] = await Promise.all([
    prisma.queue.findFirst({
      where: { date: boardDate, queueNumber: { lt: myQueue.queueNumber } },
      orderBy: { queueNumber: 'desc' },
      include: { patient: true },
    }),
    prisma.queue.findFirst({
      where: { date: boardDate, queueNumber: { gt: myQueue.queueNumber } },
      orderBy: { queueNumber: 'asc' },
      include: { patient: true },
    }),
  ])

  const formatQueueNumber = (num: number) => `A-${num.toString().padStart(2, '0')}`
  const maskName = (name: string) => {
    if (name.length <= 3) return name[0] + '***'
    return name.slice(0, 3) + '***'
  }
  const statusLabel = (status: string) =>
    status === 'CALLED' ? 'SEDANG DILAYANI' : status === 'COMPLETED' ? 'SELESAI' : 'MENUNGGU'

  return NextResponse.json({
    success: true,
    queueId: myQueue.id,
    myQueue: {
      number: formatQueueNumber(myQueue.queueNumber),
      position,
      status: statusLabel(myQueue.status),
      patientName: myQueue.patient.name,
      code: myQueue.patientCode,
    },
    prevQueue: prevQueue
      ? {
          number: formatQueueNumber(prevQueue.queueNumber),
          patientNameMasked: maskName(prevQueue.patient.name),
          status: statusLabel(prevQueue.status),
        }
      : null,
    nextQueue: nextQueue
      ? {
          number: formatQueueNumber(nextQueue.queueNumber),
          patientNameMasked: maskName(nextQueue.patient.name),
          status: statusLabel(nextQueue.status),
        }
      : null,
    currentCalled: currentCalled ? {
      number: formatQueueNumber(currentCalled.queueNumber),
      patientNameMasked: maskName(currentCalled.patient.name),
      calledAt: currentCalled.calledAt,
    } : null,
    nextQueues: nextQueues.map((q:any) => ({
      number: formatQueueNumber(q.queueNumber),
      patientNameMasked: maskName(q.patient.name),
      isMe: q.id === myQueue.id,
    })),
    totalToday,
  })
}
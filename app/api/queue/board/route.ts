import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPatientToken } from '@/lib/middleware/auth'

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

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentCalled = await prisma.queue.findFirst({
    where: {
      date: today,
      status: 'CALLED',
      calledAt: { not: null }
    },
    orderBy: { calledAt: 'desc' },
    include: { patient: true }
  })

  const nextQueues = await prisma.queue.findMany({
    where: {
      date: today,
      status: 'WAITING',
      queueNumber: { gt: myQueue.queueNumber }
    },
    orderBy: { queueNumber: 'asc' },
    take: 5,
    include: { patient: true }
  })

  const totalToday = await prisma.queue.count({
    where: { date: today }
  })

  const position = await prisma.queue.count({
    where: {
      date: today,
      status: 'WAITING',
      queueNumber: { lt: myQueue.queueNumber }
    }
  }) + 1

  const formatQueueNumber = (num: number) => `A-${num.toString().padStart(2, '0')}`
  const maskName = (name: string) => {
    if (name.length <= 3) return name[0] + '***'
    return name.slice(0, 3) + '***'
  }

  return NextResponse.json({
    success: true,
    queueId: myQueue.id,
    myQueue: {
      number: formatQueueNumber(myQueue.queueNumber),
      position,
      status: myQueue.status,
    },
    currentCalled: currentCalled ? {
      number: formatQueueNumber(currentCalled.queueNumber),
      patientNameMasked: maskName(currentCalled.patient.name),
      calledAt: currentCalled.calledAt,
    } : null,
    nextQueues: nextQueues.map(q => ({
      number: formatQueueNumber(q.queueNumber),
      patientNameMasked: maskName(q.patient.name),
      isMe: q.id === myQueue.id,
    })),
    totalToday,
  })
}
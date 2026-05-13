import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPatientToken } from '@/lib/middleware/auth'

export async function GET(request: NextRequest) {
  // Verifikasi patient token
  const authResult = await verifyPatientToken(request)
  if (!authResult.valid) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status || 401 }) // ✅ PERBAIKAN: fallback status
  }
  const queueId = authResult.queueId
  if (!queueId) { 
    return NextResponse.json({ success: false, error: 'Invalid token data' }, { status: 400 })
  }

  const queue = await prisma.queue.findUnique({
    where: { id: queueId },
  })
  if (!queue) {
    return NextResponse.json({ success: false, error: 'Queue not found' }, { status: 404 })
  }

  const waitingCount = await prisma.queue.count({
    where: {
      date: queue.date,
      status: 'WAITING',
      createdAt: { lt: queue.createdAt },
    },
  })
  const position = waitingCount + 1
  const totalWaiting = await prisma.queue.count({
    where: {
      date: queue.date,
      status: 'WAITING',
    },
  })
  return NextResponse.json({
    success: true,
    queue_id: queueId,         
    queue_position: position,
    total_queue: totalWaiting,
  })
}
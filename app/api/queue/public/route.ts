export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addDays, clinicDateOnly } from '@/lib/clinic-date'
import { readClinicStatus } from '@/lib/clinic-status'

/**
 * Public, non-identifying clinic status for the landing page.
 * Returns only aggregate counters and the number currently being served.
 */
export async function GET() {
  try {
    const today = clinicDateOnly()
    const tomorrow = addDays(today, 1)

    const [serving, waitingCount, totalToday, clinicStatus] = await Promise.all([
      prisma.queue.findFirst({
        where: { date: today, status: 'CALLED' },
        orderBy: { calledAt: 'desc' },
        select: { queueNumber: true },
      }),
      prisma.queue.count({ where: { date: today, status: 'WAITING' } }),
      prisma.queue.count({
        where: { date: { gte: today, lt: tomorrow } },
      }),
      readClinicStatus(),
    ])

    return NextResponse.json({
      success: true,
      isOpen: clinicStatus.isOpen,
      statusUpdatedAt: clinicStatus.updatedAt,
      servingNumber: serving ? `A-${serving.queueNumber.toString().padStart(2, '0')}` : null,
      waitingCount,
      totalToday,
    })
  } catch (error) {
    console.error('[GET /api/queue/public] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal memuat status klinik' },
      { status: 500 }
    )
  }
}

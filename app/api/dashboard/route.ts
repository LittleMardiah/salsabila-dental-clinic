import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'

export async function GET(request: Request) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // 1. Jumlah pasien hari ini (berdasarkan queue.date, sama dengan halaman antrian)
  const todayPatients = await prisma.queue.count({
    where: {
      date: {
        gte: today,
        lt: tomorrow,
      },
    },
  })

  // 2. Total revenue hari ini (dari transaksi confirmed dengan confirmedAt hari ini)
  const revenueResult = await prisma.transaction.aggregate({
    where: {
      status: 'CONFIRMED',
      confirmedAt: {
        gte: today,
        lt: tomorrow,
      },
    },
    _sum: {
      amount: true,
    },
  })
  const todayRevenue = revenueResult._sum.amount || 0

  // 3. Jumlah antrian aktif (WAITING atau CALLED)
  const activeQueues = await prisma.queue.count({
    where: {
      status: {
        in: ['WAITING', 'CALLED'],
      },
    },
  })

  // Log untuk debugging (bisa dilihat di terminal)
  console.log('[Dashboard] todayPatients:', todayPatients)
  console.log('[Dashboard] todayRevenue:', todayRevenue)
  console.log('[Dashboard] activeQueues:', activeQueues)

  return NextResponse.json({
    success: true,
    data: {
      todayPatients,
      todayRevenue,
      activeQueues,
    },
  })
}
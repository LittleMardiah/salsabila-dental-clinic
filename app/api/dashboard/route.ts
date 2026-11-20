export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'
import { clinicDateOnly, clinicDayRange } from '@/lib/clinic-date'

/**
 * @openapi
 * /api/dashboard:
 *   get:
 *     summary: Mendapatkan data KPI dashboard
 *     description: Mengembalikan jumlah pasien hari ini, total pendapatan hari ini, dan jumlah antrian aktif.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     todayPatients:
 *                       type: integer
 *                     todayRevenue:
 *                       type: number
 *                     activeQueues:
 *                       type: integer
 *       401:
 *         description: Token admin tidak valid atau tidak ada
 */
export async function GET(request: Request) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const today = clinicDateOnly()
  const { start: dayStart, end: dayEnd } = clinicDayRange()

  const todayPatients = await prisma.queue.count({
    where: { date: today },
  })

  const revenueResult = await prisma.transaction.aggregate({
    where: {
      status: 'CONFIRMED',
      confirmedAt: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    _sum: {
      amount: true,
    },
  })
  const todayRevenue = revenueResult._sum.amount || 0

  const activeQueues = await prisma.queue.count({
    where: {
      status: {
        in: ['WAITING', 'CALLED'],
      },
    },
  })

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
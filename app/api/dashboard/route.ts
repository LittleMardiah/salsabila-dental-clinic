import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'

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

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayPatients = await prisma.queue.count({
    where: {
      date: {
        gte: today,
        lt: tomorrow,
      },
    },
  })

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
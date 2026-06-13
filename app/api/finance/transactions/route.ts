export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'

/**
 * @openapi
 * /api/finance/transactions:
 *   get:
 *     summary: Mendapatkan daftar transaksi keuangan
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter berdasarkan tanggal (YYYY-MM-DD)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED]
 *         description: Filter berdasarkan status transaksi
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Nomor halaman
 *     responses:
 *       200:
 *         description: Daftar transaksi berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Tidak terautentikasi
 */
export async function GET(request: Request) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const url = new URL(request.url)
  const date = url.searchParams.get('date')
  const status = url.searchParams.get('status')
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = 50

  const where: any = {}
  if (date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    where.createdAt = { gte: start, lte: end }
  }
  if (status && ['PENDING', 'CONFIRMED'].includes(status)) {
    where.status = status
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        patient: { select: { name: true } },
        queue: { select: { queueNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
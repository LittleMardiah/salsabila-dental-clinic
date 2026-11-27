export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'
import { clinicDayRangeFromInput } from '@/lib/clinic-date'
import { dateOnlyInputSchema } from '@/lib/validation'

const transactionQuerySchema = z
  .object({
    date: dateOnlyInputSchema.optional(),
    status: z.enum(['PENDING', 'CONFIRMED']).optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
  })
  .strict('Parameter query tidak dikenal')

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
  const parsedQuery = transactionQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries())
  )
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.errors[0]?.message || 'Parameter tidak valid' },
      { status: 400 }
    )
  }

  const { date, status, page } = parsedQuery.data
  const limit = 50

  const where: any = {}
  if (date) {
    const { start, end } = clinicDayRangeFromInput(date)
    where.createdAt = { gte: start, lt: end }
  }
  if (status) where.status = status

  try {
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
  } catch (error) {
    console.error(
      '[GET /api/finance/transactions] gagal memuat transaksi:',
      error instanceof Error ? error.message : 'unknown error'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
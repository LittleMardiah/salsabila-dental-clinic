export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'
import { addAuditLog } from '@/lib/services/audit.service'
import { dateOnlyFromInput } from '@/lib/clinic-date'

const reconcileSchema = z
  .object({
    date: z.string().date(),
    totalRecorded: z.number().finite().positive().max(1_000_000_000_000),
    notes: z.string().trim().max(1000, 'Catatan terlalu panjang').optional(),
  })
  .strict('Data rekonsiliasi tidak valid')

const reconcileQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict('Parameter query tidak dikenal')

/**
 * @openapi
 * /api/finance/reconcile:
 *   get:
 *     summary: Mendapatkan daftar rekonsiliasi harian
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Nomor halaman
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Jumlah item per halaman
 *     responses:
 *       200:
 *         description: Daftar rekonsiliasi berhasil diambil
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
 *                     $ref: '#/components/schemas/DailyReconciliation'
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Tidak terautentikasi
 */
export async function GET(request: Request) {
  try {
    const auth = await verifyAdminToken(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const parsedQuery = reconcileQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    )
    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: parsedQuery.error.errors[0]?.message || 'Parameter tidak valid' },
        { status: 400 }
      )
    }

    const { page, limit } = parsedQuery.data
    const skip = (page - 1) * limit

    const [reconciliations, total] = await Promise.all([
      prisma.dailyReconciliation.findMany({
        orderBy: { date: 'desc' },
        take: limit,
        skip,
      }),
      prisma.dailyReconciliation.count()
    ])

    return NextResponse.json({
      success: true,
      data: reconciliations,
      pagination: { page, limit, total }
    })
  } catch (error) {
    console.error(
      '[GET /api/finance/reconcile] Error:',
      error instanceof Error ? error.message : 'unknown error'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @openapi
 * /api/finance/reconcile:
 *   post:
 *     summary: Menyimpan rekonsiliasi harian
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - totalRecorded
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               totalRecorded:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rekonsiliasi berhasil disimpan
 *       400:
 *         description: Input tidak valid
 *       401:
 *         description: Tidak terautentikasi
 *       409:
 *         description: Rekonsiliasi sudah ada untuk tanggal tersebut
 */
export async function POST(request: Request) {
  try {
    const auth = await verifyAdminToken(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const parsed = reconcileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { date, totalRecorded, notes } = parsed.data
    const reconcileDate = dateOnlyFromInput(date)

    // Cek duplikasi
    const existing = await prisma.dailyReconciliation.findUnique({
      where: { date: reconcileDate },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Reconciliation already exists for this date' },
        { status: 409 }
      )
    }

    const reconciliation = await prisma.dailyReconciliation.create({
      data: {
        date: reconcileDate,
        totalRecorded,
        notes,
        adminId: auth.username!, 
      },
    })

    await addAuditLog(
      auth.username!,
      'RECONCILE',
      'daily_reconciliation',
      reconciliation.id.toString(),
      { date, totalRecorded, notes },
      request.headers.get('x-forwarded-for') || 'unknown'
    )

    return NextResponse.json({
      success: true,
      message: 'Reconciliation saved',
      data: reconciliation,
    })
  } catch (error) {
    console.error(
      '[POST /api/finance/reconcile] Error:',
      error instanceof Error ? error.message : 'unknown error'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
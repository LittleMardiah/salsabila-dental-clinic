export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/ServerAuth'

const patientQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(100, 'Kata kunci terlalu panjang').optional(),
  })
  .strict('Parameter query tidak dikenal')

/**
 * @openapi
 * /api/patients:
 *   get:
 *     summary: Mendapatkan daftar pasien (pagination & pencarian)
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Nomor halaman (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Jumlah item per halaman (default 10, max 100)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Kata kunci pencarian (nama, telepon, email) - case sensitive
 *     responses:
 *       200:
 *         description: Daftar pasien berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 patients:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Patient'
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Tidak terautentikasi
 */
export async function GET(request: Request) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsedQuery = patientQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries())
  )
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: parsedQuery.error.errors[0]?.message || 'Parameter tidak valid' },
      { status: 400 }
    )
  }

  const { page: validPage, limit: validLimit, search = '' } = parsedQuery.data
  const skip = (validPage - 1) * validLimit

  try {
    const where: Prisma.PatientWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { noRm: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}

    // Ambil data pasien dan total count secara paralel
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: validLimit,
        select: {
          id: true,
          noRm: true,
          name: true,
          phone: true,
          email: true,
          dateOfBirth: true,
          allergies: true,
        },
      }),
      prisma.patient.count({ where }),
    ])

    const totalPages = Math.ceil(total / validLimit)

    return NextResponse.json({
      success: true,
      patients,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('[GET /api/patients] gagal memuat pasien:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
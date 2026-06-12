// app/api/patients/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/ServerAuth'

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
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const search = searchParams.get('search') || ''

  // Validasi page & limit
  const validPage = Math.max(1, page)
  const validLimit = Math.min(100, Math.max(1, limit))
  const skip = (validPage - 1) * validLimit

  // Build where clause (case-sensitive search – cukup untuk demo)
  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
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
}
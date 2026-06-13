export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/ServerAuth'

/**
 * @openapi
 * /api/patient/{id}:
 *   get:
 *     summary: Mendapatkan data pasien berdasarkan ID
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID pasien
 *     responses:
 *       200:
 *         description: Data pasien berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       400:
 *         description: ID tidak valid
 *       401:
 *         description: Tidak terautentikasi
 *       404:
 *         description: Pasien tidak ditemukan
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
  }

  const id = parseInt(params.id)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 })
  }

  const patient = await prisma.patient.findUnique({
    where: { id },
  })

  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  return NextResponse.json(patient)
}
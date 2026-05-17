import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/ServerAuth'

/**
 * @openapi
 * /api/patient/{id}/completed-queues:
 *   get:
 *     summary: Mendapatkan daftar antrian yang sudah selesai untuk pasien tertentu
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
 *         description: Daftar antrian selesai berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 queues:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       label:
 *                         type: string
 *       400:
 *         description: ID tidak valid
 *       401:
 *         description: Tidak terautentikasi
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
  }

  const patientId = parseInt(params.id)
  if (isNaN(patientId)) {
    return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 })
  }

  const queues = await prisma.queue.findMany({
    where: {
      patientId,
      status: 'COMPLETED',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      queueNumber: true,
      createdAt: true,
    },
  })

  const formattedQueues = queues.map(q => ({
    id: q.id,
    label: `A-${q.queueNumber.toString().padStart(2, '0')} - ${new Date(q.createdAt).toLocaleTimeString()}`,
  }))

  return NextResponse.json({ success: true, queues: formattedQueues })
}
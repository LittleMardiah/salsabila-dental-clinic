// app/api/finance/transactions/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'

/**
 * @openapi
 * /api/finance/transactions/{id}:
 *   get:
 *     summary: Mendapatkan detail transaksi (untuk halaman konfirmasi)
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID transaksi
 *     responses:
 *       200:
 *         description: Detail transaksi berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Tidak terautentikasi
 *       404:
 *         description: Transaksi tidak ditemukan
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  const transactionId = parseInt(id)
  if (isNaN(transactionId)) {
    return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 })
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      patient: { select: { id: true, name: true, phone: true, email: true } },
      queue: { select: { queueNumber: true, date: true } },
    },
  })

  if (!transaction) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, transaction })
}
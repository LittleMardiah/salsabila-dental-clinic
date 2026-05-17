import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/ServerAuth'
import { addAuditLog } from '@/lib/services/audit.service' 

/**
 * @openapi
 * /api/queue/{id}/complete:
 *   patch:
 *     summary: Menyelesaikan antrian (mark as COMPLETED) dan membuat transaksi pending
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID antrian
 *     responses:
 *       200:
 *         description: Antrian selesai, transaksi dibuat
 *       400:
 *         description: Input tidak valid atau antrian tidak dalam status CALLED
 *       401:
 *         description: Tidak terautentikasi
 *       404:
 *         description: Antrian tidak ditemukan
 */

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminToken(request)
  if (!authResult.valid) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status || 401 }
    )
  }
  const adminUsername = authResult.username || 'unknown' 

  const { id } = await params
  const queueId = parseInt(id)
  if (isNaN(queueId)) {
    return NextResponse.json({ success: false, error: 'Invalid queue ID' }, { status: 400 })
  }

  try {
    const queue = await prisma.queue.findUnique({ where: { id: queueId } })
    if (!queue) return NextResponse.json({ success: false, error: 'Queue not found' }, { status: 404 })
    if (queue.status !== 'CALLED') {
      return NextResponse.json({ success: false, error: 'Queue can only be completed if status is CALLED' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedQueue = await tx.queue.update({
        where: { id: queueId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
      const transactionRecord = await tx.transaction.create({
        data: { queueId: updatedQueue.id, patientId: updatedQueue.patientId, status: 'PENDING' },
      })
      return { updatedQueue, transactionRecord }
    })

    await addAuditLog(
      adminUsername,
      'COMPLETE_QUEUE',
      'queue',
      queueId.toString(),
      { queueNumber: queue.queueNumber, transactionId: result.transactionRecord.id },
      request.headers.get('x-forwarded-for') || 'unknown'
    )

    return NextResponse.json({
      success: true,
      transaction_id: result.transactionRecord.id,
      message: 'Queue completed and transaction created',
    })
  } catch (error) {
    console.error('Error completing queue:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
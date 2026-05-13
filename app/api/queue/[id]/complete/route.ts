import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/ServerAuth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verifikasi token admin
  const authResult = await verifyAdminToken(request)
  if (!authResult.valid) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status || 401 }
    )
  }
  const adminUsername = authResult.username

  const { id } = await params
  const queueId = parseInt(id)
  if (isNaN(queueId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid queue ID' },
      { status: 400 }
    )
  }

  try {
    // Ambil data antrian yang akan diselesaikan
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
    })

    if (!queue) {
      return NextResponse.json(
        { success: false, error: 'Queue not found' },
        { status: 404 }
      )
    }

    if (queue.status !== 'CALLED') {
      return NextResponse.json(
        { success: false, error: 'Queue can only be completed if status is CALLED' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update status menjadi COMPLETED dan set completedAt
      const updatedQueue = await tx.queue.update({
        where: { id: queueId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })

      // Buat transaction record otomatis (status PENDING, amount null)
      const transactionRecord = await tx.transaction.create({
        data: {
          queueId: updatedQueue.id,
          patientId: updatedQueue.patientId,
          status: 'PENDING',
          // amount, paymentMethod, receiptUrl akan diisi nanti di fase finance
        },
      })

      return { updatedQueue, transactionRecord }
    })

    // Catat audit log (sementara dikomentari karena audit service belum ada)
    // await addAuditLog(adminUsername, 'COMPLETE_QUEUE', 'queue', queueId, { transactionId: result.transactionRecord.id })

    return NextResponse.json({
      success: true,
      transaction_id: result.transactionRecord.id,
      message: 'Queue completed and transaction created',
    })
  } catch (error) {
    console.error('Error completing queue:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
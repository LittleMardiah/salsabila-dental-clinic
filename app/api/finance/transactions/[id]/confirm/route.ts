import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'
import { writeFile, mkdir } from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { PaymentMethod, TransactionStatus } from '@prisma/client'
import { addAuditLog } from '@/lib/services/audit.service'
import sharp from 'sharp'
import path from 'path'

// Schema validasi
const confirmSchema = z.object({
  amount: z.number().positive('Amount harus lebih dari 0'),
  paymentMethod: z.enum(['CASH', 'TRANSFER']),
})

/**
 * @openapi
 * /api/finance/transactions/{id}/confirm:
 *   post:
 *     summary: Konfirmasi pembayaran transaksi
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
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - paymentMethod
 *             properties:
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, TRANSFER]
 *               proof:
 *                 type: string
 *                 format: binary
 *                 description: Bukti transfer (wajib jika paymentMethod=TRANSFER)
 *     responses:
 *       200:
 *         description: Transaksi berhasil dikonfirmasi
 *       400:
 *         description: Input tidak valid
 *       401:
 *         description: Tidak terautentikasi
 *       404:
 *         description: Transaksi tidak ditemukan
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAdminToken(request)
    if (!auth.valid) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      )
    }
    const adminUsername = auth.username || 'unknown' 

    const transactionId = parseInt(params.id)
    if (isNaN(transactionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction ID' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const amountRaw = formData.get('amount')
    const paymentMethodStr = formData.get('paymentMethod') as string
    const proofFile = formData.get('proof') as File | null

    const amount = parseFloat(amountRaw as string)
    const parsed = confirmSchema.safeParse({ amount, paymentMethod: paymentMethodStr })
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { queue: { include: { patient: true } } }
    })
    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      )
    }

    let receiptUrl: string | null = null
    if (paymentMethodStr === 'TRANSFER') {
      if (!proofFile) {
        return NextResponse.json(
          { success: false, error: 'Bukti transfer wajib diupload untuk metode TRANSFER' },
          { status: 400 }
        )
      }
      const uploadDir = path.join(process.cwd(), 'public/uploads/finance')
      await mkdir(uploadDir, { recursive: true })
      const fileExtension = proofFile.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExtension}`
      const filePath = path.join(uploadDir, fileName)
      const bytes = await proofFile.arrayBuffer()
      let bufferToWrite: Buffer | Uint8Array = Buffer.from(bytes)
      
      if (proofFile.type.startsWith('image/')) {
        try {
          bufferToWrite = await sharp(bufferToWrite)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 70 })
            .toBuffer()
        } catch (compressError) {
          console.error('Compression failed, using original:', compressError)
        }
      }
      
      await writeFile(filePath, bufferToWrite)
      receiptUrl = `/uploads/finance/${fileName}`
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        amount,
        paymentMethod: paymentMethodStr as PaymentMethod,
        status: TransactionStatus.CONFIRMED,
        confirmedAt: new Date(),
        receiptUrl: receiptUrl ?? undefined,
      },
    })

    await addAuditLog(
      adminUsername,
      'CONFIRM_TRANSACTION',
      'transaction',
      transactionId.toString(),
      { amount, paymentMethod: paymentMethodStr, receiptUrl },
      request.headers.get('x-forwarded-for') || 'unknown'
    )

    return NextResponse.json({
      success: true,
      message: 'Transaksi berhasil dikonfirmasi',
      data: {
        id: updated.id,
        status: updated.status,
        confirmedAt: updated.confirmedAt,
      },
    })
  } catch (error) {
    console.error('Error confirming transaction:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
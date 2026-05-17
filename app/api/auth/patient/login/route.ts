import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const patientLoginSchema = z.object({
  code: z.string().length(6),
})

/**
 * @openapi
 * /api/auth/patient/login:
 *   post:
 *     summary: Login pasien menggunakan kode 6 digit
 *     description: Memverifikasi kode antrian yang diberikan admin, mengembalikan posisi dan total antrian, serta menyimpan cookie patient token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 length: 6
 *                 example: "A3F9K2"
 *     responses:
 *       200:
 *         description: Login berhasil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 queue_position:
 *                   type: integer
 *                 total_queue:
 *                   type: integer
 *                 queue_id:
 *                   type: integer
 *       400:
 *         description: Format kode salah
 *       404:
 *         description: Kode tidak valid atau sudah kadaluarsa
 *       500:
 *         description: Server error
 */
export async function POST(request: Request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = patientLoginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid code format' }, { status: 400 })
  }
  const { code } = parsed.data

  const queue = await prisma.queue.findFirst({
    where: {
      patientCode: code,
      codeExpiresAt: { gt: new Date() },
      status: { in: ['WAITING', 'CALLED'] },
    },
  })
  if (!queue) {
    return NextResponse.json({ success: false, error: 'Invalid or expired code' }, { status: 404 })
  }

  const waitingCount = await prisma.queue.count({
    where: {
      date: queue.date,
      status: 'WAITING',
      createdAt: { lt: queue.createdAt },
    },
  })
  const position = waitingCount + 1
  const totalWaiting = await prisma.queue.count({
    where: {
      date: queue.date,
      status: 'WAITING',
    },
  })

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
  const token = jwt.sign({ queueId: queue.id, role: 'patient' }, jwtSecret, { expiresIn: '24h' })

  const response = NextResponse.json({
    success: true,
    queue_position: position,
    total_queue: totalWaiting,
    queue_id: queue.id,
  })

  response.cookies.set('patient_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',           
    maxAge: 86400,
    path: '/',                 
  })

  console.log('[Patient Login] Cookie set. Token length:', token.length, 'Queue ID:', queue.id)

  return response
}
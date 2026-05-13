import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const patientLoginSchema = z.object({
  code: z.string().length(6),
})

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

  // Cari queue dengan patientCode, belum expired, status WAITING atau CALLED
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

  // Hitung posisi
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
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const loginSchema = z.object({
  code: z.string().length(6, 'Kode harus 6 karakter'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { code } = parsed.data
    const now = new Date()

    // Cari queue dengan kode yang valid, belum expired, dan status belum COMPLETED
    const queue = await prisma.queue.findFirst({
      where: {
        patientCode: code,
        codeExpiresAt: { gt: now },
        status: { not: 'COMPLETED' }
      },
      include: { patient: true }
    })

    if (!queue) {
      return NextResponse.json({ error: 'Kode tidak valid atau sudah kadaluarsa' }, { status: 404 })
    }

    // Hitung posisi antrian (jumlah queue dengan status WAITING dan createdAt lebih kecil)
    const position = await prisma.queue.count({
      where: {
        date: queue.date,
        status: 'WAITING',
        createdAt: { lt: queue.createdAt }
      }
    }) + 1

    const totalWaiting = await prisma.queue.count({
      where: {
        date: queue.date,
        status: { in: ['WAITING', 'CALLED'] }
      }
    })

    // Generate JWT untuk pasien
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) throw new Error('JWT_SECRET missing')

    const token = jwt.sign(
      { queueId: queue.id, patientId: queue.patientId, role: 'patient' },
      jwtSecret,
      { expiresIn: '24h' }
    )

    const response = NextResponse.json({
      success: true,
      queue_position: position,
      total_queue: totalWaiting,
      queue_id: queue.id
    })

    response.cookies.set('patient_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Patient login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
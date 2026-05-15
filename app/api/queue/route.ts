// app/api/queue/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/ServerAuth'
import { addAuditLog } from '@/lib/services/audit.service'
import { generateQueueNumber, generatePatientCode } from '@/lib/utils/QueueUtils' 

// Schema validasi untuk request body POST
const addPatientSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional(),
  keluhan: z.string().optional(),
  mode: z.enum(['ONLINE', 'MANUAL']),
})

// Schema untuk query parameters GET
const querySchema = z.object({
  date: z.string().optional(),
  status: z.enum(['WAITING', 'CALLED', 'COMPLETED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

export async function POST(request: Request) {
  // Verifikasi token admin
  const authResult = await verifyAdminToken(request)
  if (!authResult.valid) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status || 401 }
    )
  }
  const adminUsername = authResult.username || 'unknown' // ✅ fallback

  // Parse dan validasi body
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON' },
      { status: 400 }
    )
  }

  const parsed = addPatientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { name, phone, email, keluhan, mode } = parsed.data

  // Tentukan tanggal hari ini (tanpa jam)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Hitung nomor antrian terbaru untuk hari ini
  const queueNumber = await generateQueueNumber(today)

  // Jika mode ONLINE, generate patient code unik
  let patientCode: string | null = null
  let codeExpiresAt: Date | null = null
  if (mode === 'ONLINE') {
    patientCode = await generatePatientCode()
    codeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  }

  try {
    const patient = await prisma.patient.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        keluhan: keluhan || null,
      },
    })
    const patientId = patient.id

    const queue = await prisma.queue.create({
      data: {
        date: today,
        queueNumber,
        patientId,
        status: 'WAITING',
        patientCode,
        codeExpiresAt,
      },
    })

    // ✅ Audit log dengan fallback untuk adminUsername dan patientCode
    await addAuditLog(
      adminUsername,
      'CREATE_QUEUE',
      'queue',
      queue.id.toString(),
      { mode, patientName: name, queueNumber: queue.queueNumber, patientCode: patientCode || '' },
      request.headers.get('x-forwarded-for') || 'unknown'
    )

    return NextResponse.json(
      {
        success: true,
        queue_id: queue.id,
        queue_number: queue.queueNumber,
        patient_code: patientCode,
        message: mode === 'ONLINE' ? 'Pasien online berhasil ditambahkan' : 'Pasien manual berhasil ditambahkan',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error adding patient to queue:', error)
    return NextResponse.json(
      { success: false, error: 'Database error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Verifikasi token admin
  const authResult = await verifyAdminToken(request)
  if (!authResult.valid) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status || 401 }
    )
  }

  // Parse query parameters dengan aman
  const searchParams = request.nextUrl.searchParams
  const dateParam = searchParams.get('date')
  const statusParam = searchParams.get('status')
  const pageParam = searchParams.get('page')
  const limitParam = searchParams.get('limit')

  // Validasi date
  let date: string | undefined = undefined
  if (dateParam) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { success: false, error: 'Format tanggal harus YYYY-MM-DD' },
        { status: 400 }
      )
    }
    date = dateParam
  }

  // Validasi status
  let status: 'WAITING' | 'CALLED' | 'COMPLETED' | undefined = undefined
  if (statusParam) {
    if (!['WAITING', 'CALLED', 'COMPLETED'].includes(statusParam)) {
      return NextResponse.json(
        { success: false, error: 'Status tidak valid' },
        { status: 400 }
      )
    }
    status = statusParam as any
  }

  // Validasi page dan limit
  let page = 1
  if (pageParam) {
    const p = parseInt(pageParam)
    if (!isNaN(p) && p > 0) page = p
  }
  let limit = 50
  if (limitParam) {
    const l = parseInt(limitParam)
    if (!isNaN(l) && l > 0) limit = Math.min(l, 100)
  }

  // Tentukan tanggal filter (default hari ini)
  let filterDate: Date
  if (date) {
    filterDate = new Date(date)
    if (isNaN(filterDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Tanggal tidak valid' },
        { status: 400 }
      )
    }
    filterDate.setHours(0, 0, 0, 0)
  } else {
    filterDate = new Date()
    filterDate.setHours(0, 0, 0, 0)
  }

  // Bangun where clause
  const where: any = { date: filterDate }
  if (status) {
    where.status = status
  }

  try {
    const total = await prisma.queue.count({ where })
    const queues = await prisma.queue.findMany({
      where,
      include: {
        patient: {
          select: { name: true, phone: true, email: true },
        },
      },
      orderBy: { queueNumber: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const formattedQueues = queues.map(q => ({
      id: q.id,
      queueNumber: q.queueNumber,
      patientName: q.patient.name,
      phone: q.patient.phone,
      status: q.status,
      patientCode: q.patientCode,
      createdAt: q.createdAt,
      calledAt: q.calledAt,
      completedAt: q.completedAt,
    }))

    return NextResponse.json({
      success: true,
      data: formattedQueues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/queue error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
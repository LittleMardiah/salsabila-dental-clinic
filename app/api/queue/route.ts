export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/ServerAuth'
import { addAuditLog } from '@/lib/services/audit.service'
import { generateQueueNumber, generatePatientCode } from '@/lib/utils/QueueUtils'
import { generateNoRm } from '@/lib/patient-id'
import { clinicDateOnly, dateOnlyFromInput } from '@/lib/clinic-date'
import { dateOnlyInputSchema, emailInputSchema, phoneInputSchema } from '@/lib/validation'

// Schema validasi untuk request body POST.
const addPatientSchema = z
  .object({
    name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120, 'Nama terlalu panjang'),
    phone: phoneInputSchema.optional(),
    email: emailInputSchema.optional(),
    keluhan: z.string().trim().max(1000, 'Keluhan terlalu panjang').optional(),
    mode: z.enum(['ONLINE', 'MANUAL']),
  })
  .strict('Field tidak dikenal pada pendaftaran antrean')

// Schema untuk query parameters GET
const querySchema = z
  .object({
    date: dateOnlyInputSchema.optional(),
    status: z.enum(['WAITING', 'CALLED', 'COMPLETED']).optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict('Parameter query tidak dikenal')

/**
 * @openapi
 * /api/queue:
 *   post:
 *     summary: Tambah pasien ke antrian (online/manual)
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - mode
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               keluhan:
 *                 type: string
 *               mode:
 *                 type: string
 *                 enum: [ONLINE, MANUAL]
 *     responses:
 *       201:
 *         description: Pasien berhasil ditambahkan
 *       400:
 *         description: Input tidak valid
 *       401:
 *         description: Tidak terautentikasi
 *   get:
 *     summary: Mendapatkan daftar antrian hari ini (admin)
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Tanggal (YYYY-MM-DD)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [WAITING, CALLED, COMPLETED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Halaman
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Jumlah per halaman (max 100)
 *     responses:
 *       200:
 *         description: Daftar antrian berhasil diambil
 *       400:
 *         description: Parameter tidak valid
 *       401:
 *         description: Tidak terautentikasi
 */

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

  // Tanggal klinik (Asia/Jakarta), disimpan sebagai UTC midnight untuk kolom DATE.
  const today = clinicDateOnly()

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
        noRm: await generateNoRm(),
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

  // Parse query parameters dengan skema ketat.
  const parsedQuery = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  if (!parsedQuery.success) {
    return NextResponse.json(
      { success: false, error: parsedQuery.error.errors[0]?.message || 'Parameter tidak valid' },
      { status: 400 }
    )
  }

  const { date, status, page, limit } = parsedQuery.data
  const filterDate = date ? dateOnlyFromInput(date) : clinicDateOnly()

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
          select: { id: true, noRm: true, name: true, phone: true, email: true, keluhan: true },
        },
      },
      orderBy: { queueNumber: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const formattedQueues = queues.map((q:any) => ({
      id: q.id,
      queueNumber: q.queueNumber,
      patientId: q.patientId,
      patientName: q.patient.name,
      noRm: q.patient.noRm,
      phone: q.patient.phone,
      email: q.patient.email,
      keluhan: q.patient.keluhan,
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
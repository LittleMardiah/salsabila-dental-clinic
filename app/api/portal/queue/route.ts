export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readClinicStatus } from '@/lib/clinic-status'
import { requirePatientSession } from '@/lib/portal-auth'
import { clinicDateOnly } from '@/lib/clinic-date'
import { generatePatientCode, generateQueueNumber } from '@/lib/utils/QueueUtils'
import { getActiveQueue, queueLabel } from '@/lib/patient-portal'
import { addAuditLog } from '@/lib/services/audit.service'

export async function GET(request: Request) {
  const auth = await requirePatientSession(request)
  if (!auth.valid) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const today = clinicDateOnly()
  const [clinic, activeQueue, serving, waitingCount, totalToday] = await Promise.all([
    readClinicStatus(),
    getActiveQueue(auth.session.patientId),
    prisma.queue.findFirst({
      where: { date: today, status: 'CALLED' },
      orderBy: { calledAt: 'desc' },
      select: { queueNumber: true },
    }),
    prisma.queue.count({ where: { date: today, status: 'WAITING' } }),
    prisma.queue.count({ where: { date: today } }),
  ])

  return NextResponse.json(
    {
      success: true,
      data: {
        clinic,
        activeQueue,
        servingLabel: serving ? queueLabel(serving.queueNumber) : null,
        waitingCount,
        totalToday,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

/** Self check-in: creates the same Queue row the clinic dashboard reads. */
export async function POST(request: Request) {
  const auth = await requirePatientSession(request)
  if (!auth.valid) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const clinic = await readClinicStatus()
  if (!clinic.isOpen) {
    return NextResponse.json(
      { success: false, error: 'Klinik sedang tutup. Silakan ambil antrean saat klinik buka.' },
      { status: 409 }
    )
  }

  const today = clinicDateOnly()
  const existing = await prisma.queue.findFirst({
    where: { patientId: auth.session.patientId, date: today, status: { in: ['WAITING', 'CALLED'] } },
    select: { id: true, queueNumber: true },
  })
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: `Anda sudah memiliki antrean aktif hari ini (${queueLabel(existing.queueNumber)}).`,
      },
      { status: 409 }
    )
  }

  const patient = await prisma.patient.findUnique({
    where: { id: auth.session.patientId },
    select: { name: true },
  })
  if (!patient) {
    return NextResponse.json({ success: false, error: 'Data pasien tidak ditemukan' }, { status: 404 })
  }

  try {
    const queueNumber = await generateQueueNumber(today)
    const patientCode = await generatePatientCode()
    const queue = await prisma.queue.create({
      data: {
        date: today,
        queueNumber,
        patientId: auth.session.patientId,
        status: 'WAITING',
        patientCode,
        codeExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    await addAuditLog(
      'patient-portal',
      'CREATE_QUEUE_SELF',
      'queue',
      queue.id.toString(),
      { patientId: auth.session.patientId, queueNumber: queue.queueNumber },
      request.headers.get('x-forwarded-for') || 'unknown'
    )

    const activeQueue = await getActiveQueue(auth.session.patientId)
    return NextResponse.json(
      {
        success: true,
        message: `Antrean ${queueLabel(queue.queueNumber)} berhasil diambil.`,
        data: { queue: activeQueue, patientCode },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/portal/queue] gagal membuat antrean:', error)
    return NextResponse.json(
      { success: false, error: 'Antrean gagal dibuat. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}

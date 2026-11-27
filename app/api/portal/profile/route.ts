export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { normalizeEmail, requirePatientSession } from '@/lib/portal-auth'

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  phone: z
    .string()
    .trim()
    .min(8, 'Nomor WhatsApp minimal 8 digit')
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, 'Nomor WhatsApp tidak valid'),
  email: z.string().trim().email('Format email tidak valid'),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal lahir wajib diisi')
    .optional(),
  allergies: z.string().trim().max(200).optional(),
})

export async function GET(request: Request) {
  const auth = await requirePatientSession(request)
  if (!auth.valid) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const account = await prisma.patientAccount.findUnique({
    where: { id: auth.session.accountId },
    select: {
      email: true,
      createdAt: true,
      lastLoginAt: true,
      patient: {
        select: {
          id: true,
          noRm: true,
          name: true,
          phone: true,
          email: true,
          dateOfBirth: true,
          allergies: true,
          createdAt: true,
        },
      },
    },
  })
  if (!account) {
    return NextResponse.json({ success: false, error: 'Akun tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: account })
}

export async function PATCH(request: Request) {
  const auth = await requirePatientSession(request)
  if (!auth.valid) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Format permintaan tidak valid' }, { status: 400 })
  }

  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message || 'Data profil tidak valid' },
      { status: 400 }
    )
  }

  const email = normalizeEmail(parsed.data.email)
  const emailOwner = await prisma.patientAccount.findUnique({
    where: { email },
    select: { id: true },
  })
  if (emailOwner && emailOwner.id !== auth.session.accountId) {
    return NextResponse.json(
      { success: false, error: 'Email tersebut sudah dipakai akun pasien lain.' },
      { status: 409 }
    )
  }

  const patient = await prisma.patient.update({
    where: { id: auth.session.patientId },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email,
      dateOfBirth: parsed.data.birthDate
        ? new Date(`${parsed.data.birthDate}T00:00:00.000Z`)
        : undefined,
      allergies: parsed.data.allergies || null,
    },
    select: {
      id: true,
      noRm: true,
      name: true,
      phone: true,
      email: true,
      dateOfBirth: true,
      allergies: true,
    },
  })

  if (emailOwner?.id === auth.session.accountId) {
    // Already the same account; nothing to change.
  } else {
    await prisma.patientAccount.update({
      where: { id: auth.session.accountId },
      data: { email },
    })
  }

  return NextResponse.json({ success: true, message: 'Profil diperbarui.', data: patient })
}

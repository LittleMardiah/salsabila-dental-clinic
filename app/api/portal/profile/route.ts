export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { normalizeEmail, requirePatientSession } from '@/lib/portal-auth'
import { emailInputSchema, phoneInputSchema } from '@/lib/validation'

function isPastDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now()
}

// .strict() rejects patientId, noRm, diagnosa, or any other field a client might
// try to mass-assign. Only these profile fields are patient-editable.
const profileSchema = z
  .object({
    name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
    phone: phoneInputSchema,
    email: emailInputSchema,
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal lahir tidak valid')
      .refine(
        (value) =>
          isPastDate(value) &&
          new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value,
        'Tanggal lahir tidak valid'
      )
      .optional(),
    allergies: z.string().trim().max(200).optional(),
  })
  .strict()

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

  return NextResponse.json(
    { success: true, data: account },
    { headers: { 'Cache-Control': 'no-store' } }
  )
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
  const phone = parsed.data.phone

  try {
    const result = await prisma.$transaction(async (tx) => {
      const emailOwner = await tx.patientAccount.findUnique({
        where: { email },
        select: { id: true },
      })
      if (emailOwner && emailOwner.id !== auth.session.accountId) {
        return { conflict: true as const, patient: null }
      }

      // Always scope by the session patientId; the request body can never
      // choose which patient row is updated.
      const patient = await tx.patient.update({
        where: { id: auth.session.patientId },
        data: {
          name: parsed.data.name,
          phone,
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

      await tx.patientAccount.update({
        where: { id: auth.session.accountId },
        data: { email },
      })

      return { conflict: false as const, patient }
    })

    if (result.conflict || !result.patient) {
      return NextResponse.json(
        { success: false, error: 'Email tersebut sudah dipakai akun pasien lain.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Profil diperbarui.', data: result.patient },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Email tersebut sudah dipakai akun pasien lain.' },
        { status: 409 }
      )
    }
    console.error('[PATCH /api/portal/profile] gagal memperbarui profil:', error)
    return NextResponse.json(
      { success: false, error: 'Profil belum dapat diperbarui. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}

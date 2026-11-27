export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/ServerAuth'
import {
  isPasswordAcceptable,
  normalizeEmail,
  normalizePhone,
  patientCookieOptions,
  PATIENT_SESSION_COOKIE,
  signPatientSession,
} from '@/lib/portal-auth'
import { generateNoRm } from '@/lib/patient-id'

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  email: z.string().trim().email('Format email tidak valid'),
  phone: z
    .string()
    .trim()
    .min(8, 'Nomor WhatsApp minimal 8 digit')
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, 'Nomor WhatsApp tidak valid'),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal lahir wajib diisi')
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`)
      return !Number.isNaN(date.getTime()) && date.getTime() < Date.now()
    }, 'Tanggal lahir tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter').max(72),
  allergies: z.string().trim().max(200).optional(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Format permintaan tidak valid' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message || 'Data pendaftaran tidak valid' },
      { status: 400 }
    )
  }

  if (!isPasswordAcceptable(parsed.data.password)) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Kata sandi belum cukup kuat. Gunakan minimal 8 karakter dengan huruf besar, huruf kecil, dan angka.',
      },
      { status: 400 }
    )
  }

  const email = normalizeEmail(parsed.data.email)
  const phone = normalizePhone(parsed.data.phone)
  const name = parsed.data.name.trim()
  const dateOfBirth = new Date(`${parsed.data.birthDate}T00:00:00.000Z`)

  const existingAccount = await prisma.patientAccount.findUnique({ where: { email } })
  if (existingAccount) {
    return NextResponse.json(
      { success: false, error: 'Email ini sudah terdaftar. Silakan masuk atau gunakan lupa kata sandi.' },
      { status: 409 }
    )
  }

  const existingPatient = await prisma.patient.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { account: true },
    orderBy: { createdAt: 'asc' },
  })

  if (existingPatient?.account) {
    return NextResponse.json(
      { success: false, error: 'Data pasien dengan email ini sudah memiliki akun portal.' },
      { status: 409 }
    )
  }

  // Existing clinical record (registered at the desk): only link when the
  // WhatsApp number matches, so email alone cannot claim someone else's EMR.
  let patientId: number
  let noRm: string
  if (existingPatient) {
    if (!existingPatient.phone || normalizePhone(existingPatient.phone) !== phone) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Email ini sudah tercatat sebagai pasien klinik. Gunakan nomor WhatsApp yang terdaftar atau hubungi resepsionis untuk bantuan.',
        },
        { status: 409 }
      )
    }
    noRm = existingPatient.noRm || (await generateNoRm())
    await prisma.patient.update({
      where: { id: existingPatient.id },
      data: {
        name,
        phone: parsed.data.phone.trim(),
        dateOfBirth,
        allergies: parsed.data.allergies || null,
        noRm,
      },
    })
    patientId = existingPatient.id
  } else {
    noRm = await generateNoRm()
    const patient = await prisma.patient.create({
      data: {
        name,
        email,
        phone: parsed.data.phone.trim(),
        dateOfBirth,
        allergies: parsed.data.allergies || null,
        noRm,
      },
    })
    patientId = patient.id
  }

  const passwordHash = await hashPassword(parsed.data.password)
  const account = await prisma.patientAccount.create({
    data: { patientId, email, passwordHash, lastLoginAt: new Date() },
  })

  const response = NextResponse.json(
    {
      success: true,
      message: 'Akun pasien berhasil dibuat.',
      patient: { id: patientId, name, email, noRm },
    },
    { status: 201 }
  )
  response.cookies.set(
    PATIENT_SESSION_COOKIE,
    signPatientSession(account.id, patientId),
    patientCookieOptions()
  )
  return response
}

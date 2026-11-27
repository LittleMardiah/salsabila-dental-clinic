export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/ServerAuth'
import {
  isPasswordAcceptable,
  isPortalAuthConfigured,
  normalizeEmail,
  normalizePhone,
  patientCookieOptions,
  PATIENT_SESSION_COOKIE,
  signPatientSession,
} from '@/lib/portal-auth'
import { generateNoRm } from '@/lib/patient-id'
import {
  consumeRateLimit,
  identifierRateLimitKey,
  ipRateLimitKey,
  tooManyRequests,
} from '@/lib/rate-limit'
import { emailInputSchema, phoneInputSchema } from '@/lib/validation'

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
    email: emailInputSchema,
    phone: phoneInputSchema,
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal lahir wajib diisi')
      .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`)
        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value &&
          date.getTime() < Date.now()
        )
      }, 'Tanggal lahir tidak valid'),
    password: z.string().min(8, 'Password minimal 8 karakter').max(72),
    allergies: z.string().trim().max(200).optional(),
  })
  .strict('Data pendaftaran tidak valid')

const REGISTER_IP_RULE = { limit: 10, windowSeconds: 60 * 60 }
const REGISTER_IDENTIFIER_RULE = { limit: 5, windowSeconds: 60 * 60 }

export async function POST(request: Request) {
  if (!isPortalAuthConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Layanan autentikasi belum siap. Hubungi Admin klinik.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const ipLimit = await consumeRateLimit(ipRateLimitKey('register', request), REGISTER_IP_RULE)
  if (!ipLimit.allowed) return tooManyRequests(ipLimit)

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

  const emailLimit = await consumeRateLimit(
    identifierRateLimitKey('register', email),
    REGISTER_IDENTIFIER_RULE
  )
  if (!emailLimit.allowed) return tooManyRequests(emailLimit)

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
        phone,
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
        phone,
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
    signPatientSession(account.id, patientId, account.sessionVersion),
    patientCookieOptions()
  )
  return response
}

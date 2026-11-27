export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/ServerAuth'
import {
  isPortalAuthConfigured,
  patientCookieOptions,
  PATIENT_SESSION_COOKIE,
  signPatientSession,
} from '@/lib/portal-auth'
import { findPatientAccountByIdentifier } from '@/lib/patient-portal'
import {
  consumeRateLimit,
  identifierRateLimitKey,
  ipRateLimitKey,
  tooManyRequests,
} from '@/lib/rate-limit'

const loginSchema = z
  .object({
    identifier: z.string().trim().min(3, 'Email atau No. WhatsApp wajib diisi').max(160),
    password: z.string().min(1, 'Kata sandi wajib diisi').max(72),
  })
  .strict('Data masuk tidak valid')

const LOGIN_IP_RULE = { limit: 30, windowSeconds: 10 * 60 }
const LOGIN_IDENTIFIER_RULE = { limit: 10, windowSeconds: 15 * 60 }

// Constant bcrypt cost for unknown identifiers so response timing does not
// reveal whether an account exists.
const DUMMY_PASSWORD_HASH = '$2b$10$0oH9TNysmSMaLzQgNGoYIeFvJdmnQynaCI/ZJaqLHhehqmU3zeuVW'

export async function POST(request: Request) {
  if (!isPortalAuthConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Layanan autentikasi belum siap. Hubungi Admin klinik.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const ipLimit = await consumeRateLimit(ipRateLimitKey('login', request), LOGIN_IP_RULE)
  if (!ipLimit.allowed) return tooManyRequests(ipLimit)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Format permintaan tidak valid' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message || 'Data masuk tidak valid' },
      { status: 400 }
    )
  }

  const identifierLimit = await consumeRateLimit(
    identifierRateLimitKey('login', parsed.data.identifier),
    LOGIN_IDENTIFIER_RULE
  )
  if (!identifierLimit.allowed) return tooManyRequests(identifierLimit)

  const account = await findPatientAccountByIdentifier(parsed.data.identifier)
  const invalidMessage =
    'Email/No. WhatsApp atau kata sandi salah. Periksa kembali data Anda.'
  if (!account) {
    await verifyPassword(parsed.data.password, DUMMY_PASSWORD_HASH)
    return NextResponse.json({ success: false, error: invalidMessage }, { status: 401 })
  }

  const passwordOk = await verifyPassword(parsed.data.password, account.passwordHash)
  if (!passwordOk) {
    return NextResponse.json({ success: false, error: invalidMessage }, { status: 401 })
  }

  await prisma.patientAccount.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
  })

  const response = NextResponse.json({
    success: true,
    patient: {
      id: account.patient.id,
      name: account.patient.name,
      email: account.patient.email,
      phone: account.patient.phone,
      noRm: account.patient.noRm,
    },
  })
  response.cookies.set(
    PATIENT_SESSION_COOKIE,
    signPatientSession(account.id, account.patientId, account.sessionVersion),
    patientCookieOptions()
  )
  return response
}

export const dynamic = 'force-dynamic'

import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  hashResetToken,
  isPortalAuthConfigured,
  RESET_TICKET_TTL_SECONDS,
  signPatientResetTicket,
} from '@/lib/portal-auth'
import { findPatientAccountByIdentifier } from '@/lib/patient-portal'
import {
  consumeRateLimit,
  identifierRateLimitKey,
  ipRateLimitKey,
  tooManyRequests,
} from '@/lib/rate-limit'

const verifySchema = z
  .object({
    identifier: z.string().trim().min(3).max(160),
    otp: z.string().regex(/^\d{6}$/, 'Kode OTP harus 6 digit'),
  })
  .strict('Data tidak valid')

const MAX_ATTEMPTS = 5
const VERIFY_IP_RULE = { limit: 20, windowSeconds: 15 * 60 }
const VERIFY_IDENTIFIER_RULE = { limit: 10, windowSeconds: 15 * 60 }

/** Step 2 of 2: verify the OTP and return a short-lived reset ticket. */
export async function POST(request: Request) {
  if (!isPortalAuthConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Layanan autentikasi belum siap. Hubungi Admin klinik.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const ipLimit = await consumeRateLimit(ipRateLimitKey('verify-otp', request), VERIFY_IP_RULE)
  if (!ipLimit.allowed) return tooManyRequests(ipLimit)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Format permintaan tidak valid' }, { status: 400 })
  }

  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message || 'Kode OTP tidak valid' },
      { status: 400 }
    )
  }

  const identifierLimit = await consumeRateLimit(
    identifierRateLimitKey('verify-otp', parsed.data.identifier),
    VERIFY_IDENTIFIER_RULE
  )
  if (!identifierLimit.allowed) return tooManyRequests(identifierLimit)

  const account = await findPatientAccountByIdentifier(parsed.data.identifier)
  if (!account || !account.resetTokenHash || !account.resetTokenExpiresAt) {
    return NextResponse.json(
      { success: false, error: 'Kode OTP tidak ditemukan. Silakan minta kode baru.' },
      { status: 400 }
    )
  }

  if (account.resetTokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { success: false, error: 'Kode OTP sudah kedaluwarsa. Silakan minta kode baru.' },
      { status: 400 }
    )
  }

  if (account.resetAttempts >= MAX_ATTEMPTS) {
    await prisma.patientAccount.update({
      where: { id: account.id },
      data: { resetTokenHash: null, resetTokenExpiresAt: null, resetAttempts: 0 },
    })
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak percobaan. Silakan minta kode OTP baru.' },
      { status: 429 }
    )
  }

  const expectedOtpHash = account.resetTokenHash
  const actualOtpHash = hashResetToken(parsed.data.otp)
  const matches =
    expectedOtpHash.length === actualOtpHash.length &&
    crypto.timingSafeEqual(Buffer.from(expectedOtpHash), Buffer.from(actualOtpHash))
  if (!matches) {
    await prisma.patientAccount.update({
      where: { id: account.id },
      data: { resetAttempts: { increment: 1 } },
    })
    return NextResponse.json(
      { success: false, error: 'Kode OTP salah. Periksa kembali kode terbaru Anda.' },
      { status: 400 }
    )
  }

  // Store a keyed hash of the ticket so it can be redeemed exactly once, even
  // though the JWT itself is stateless.
  const resetTicket = signPatientResetTicket(account.id)
  await prisma.patientAccount.update({
    where: { id: account.id },
    data: {
      resetTokenHash: hashResetToken(resetTicket),
      resetTokenExpiresAt: new Date(Date.now() + RESET_TICKET_TTL_SECONDS * 1000),
      resetAttempts: 0,
    },
  })

  return NextResponse.json(
    { success: true, resetTicket },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

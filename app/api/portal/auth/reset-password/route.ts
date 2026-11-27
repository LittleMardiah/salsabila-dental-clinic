export const dynamic = 'force-dynamic'

import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/ServerAuth'
import {
  hashResetToken,
  isPasswordAcceptable,
  isPortalAuthConfigured,
  patientCookieOptions,
  PATIENT_SESSION_COOKIE,
  signPatientSession,
  verifyPatientResetTicket,
} from '@/lib/portal-auth'
import { consumeRateLimit, hashRateLimitKey, ipRateLimitKey, tooManyRequests } from '@/lib/rate-limit'

const resetSchema = z
  .object({
    resetTicket: z.string().min(20, 'Sesi pemulihan tidak valid').max(2000),
    password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(72),
  })
  .strict('Data tidak valid')

const RESET_IP_RULE = { limit: 10, windowSeconds: 15 * 60 }
const RESET_TICKET_RULE = { limit: 5, windowSeconds: 15 * 60 }

function hashesMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/** Final step: save the new password using the ticket from the OTP step. */
export async function POST(request: Request) {
  if (!isPortalAuthConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Layanan autentikasi belum siap. Hubungi Admin klinik.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const ipLimit = await consumeRateLimit(ipRateLimitKey('reset-password', request), RESET_IP_RULE)
  if (!ipLimit.allowed) return tooManyRequests(ipLimit)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Format permintaan tidak valid' }, { status: 400 })
  }

  const parsed = resetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message || 'Data tidak valid' },
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

  const ticketLimit = await consumeRateLimit(
    `patient:reset-password:ticket:${hashRateLimitKey(parsed.data.resetTicket)}`,
    RESET_TICKET_RULE
  )
  if (!ticketLimit.allowed) return tooManyRequests(ticketLimit)

  const accountId = verifyPatientResetTicket(parsed.data.resetTicket)
  if (!accountId) {
    return NextResponse.json(
      { success: false, error: 'Sesi pemulihan sudah berakhir. Ulangi verifikasi OTP.' },
      { status: 400 }
    )
  }

  const account = await prisma.patientAccount.findUnique({ where: { id: accountId } })
  const expectedHash = account?.resetTokenHash
  const ticketHash = hashResetToken(parsed.data.resetTicket)
  if (
    !account ||
    !expectedHash ||
    !hashesMatch(expectedHash, ticketHash) ||
    !account.resetTokenExpiresAt ||
    account.resetTokenExpiresAt.getTime() < Date.now()
  ) {
    return NextResponse.json(
      { success: false, error: 'Sesi pemulihan sudah berakhir. Ulangi verifikasi OTP.' },
      { status: 400 }
    )
  }

  // Incrementing sessionVersion revokes every cookie issued before this reset.
  const updated = await prisma.patientAccount.update({
    where: { id: account.id },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      resetAttempts: 0,
      sessionVersion: { increment: 1 },
      lastLoginAt: new Date(),
    },
    select: { sessionVersion: true },
  })

  const response = NextResponse.json({
    success: true,
    message: 'Kata sandi berhasil diperbarui. Anda sudah masuk kembali.',
  })
  response.cookies.set(
    PATIENT_SESSION_COOKIE,
    signPatientSession(account.id, account.patientId, updated.sessionVersion),
    patientCookieOptions()
  )
  return response
}

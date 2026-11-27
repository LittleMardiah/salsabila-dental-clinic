export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashResetToken, signPatientResetTicket } from '@/lib/portal-auth'
import { findPatientAccountByIdentifier } from '@/lib/patient-portal'

const verifySchema = z.object({
  identifier: z.string().trim().min(3).max(160),
  otp: z.string().regex(/^\d{6}$/, 'Kode OTP harus 6 digit'),
})

const MAX_ATTEMPTS = 5

/** Step 2 of 2: verify the OTP and return a short-lived reset ticket. */
export async function POST(request: Request) {
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

  const matches = account.resetTokenHash === hashResetToken(parsed.data.otp)
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

  await prisma.patientAccount.update({
    where: { id: account.id },
    data: { resetTokenHash: null, resetTokenExpiresAt: null, resetAttempts: 0 },
  })

  return NextResponse.json({
    success: true,
    resetTicket: signPatientResetTicket(account.id),
    email: account.email,
  })
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/ServerAuth'
import {
  isPasswordAcceptable,
  patientCookieOptions,
  PATIENT_SESSION_COOKIE,
  signPatientSession,
  verifyPatientResetTicket,
} from '@/lib/portal-auth'

const resetSchema = z.object({
  resetTicket: z.string().min(20, 'Sesi pemulihan tidak valid'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(72),
})

/** Final step: save the new password using the ticket from the OTP step. */
export async function POST(request: Request) {
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

  const accountId = verifyPatientResetTicket(parsed.data.resetTicket)
  if (!accountId) {
    return NextResponse.json(
      { success: false, error: 'Sesi pemulihan sudah berakhir. Ulangi verifikasi OTP.' },
      { status: 400 }
    )
  }

  const account = await prisma.patientAccount.findUnique({ where: { id: accountId } })
  if (!account) {
    return NextResponse.json({ success: false, error: 'Akun tidak ditemukan' }, { status: 404 })
  }

  await prisma.patientAccount.update({
    where: { id: account.id },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      resetAttempts: 0,
      lastLoginAt: new Date(),
    },
  })

  const response = NextResponse.json({
    success: true,
    message: 'Kata sandi berhasil diperbarui. Anda sudah masuk kembali.',
  })
  response.cookies.set(
    PATIENT_SESSION_COOKIE,
    signPatientSession(account.id, account.patientId),
    patientCookieOptions()
  )
  return response
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/ServerAuth'
import {
  patientCookieOptions,
  PATIENT_SESSION_COOKIE,
  signPatientSession,
} from '@/lib/portal-auth'
import { findPatientAccountByIdentifier } from '@/lib/patient-portal'

const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Email atau No. WhatsApp wajib diisi').max(160),
  password: z.string().min(1, 'Kata sandi wajib diisi').max(72),
})

export async function POST(request: Request) {
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

  const account = await findPatientAccountByIdentifier(parsed.data.identifier)
  const invalidMessage =
    'Email/No. WhatsApp atau kata sandi salah. Periksa kembali data Anda.'
  if (!account) {
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
    signPatientSession(account.id, account.patientId),
    patientCookieOptions()
  )
  return response
}

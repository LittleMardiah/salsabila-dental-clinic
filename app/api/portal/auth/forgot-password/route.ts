export const dynamic = 'force-dynamic'

import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { hashResetToken } from '@/lib/portal-auth'
import { isDemoEnabled } from '@/lib/portal-demo'
import { findPatientAccountByIdentifier } from '@/lib/patient-portal'

const forgotSchema = z.object({
  identifier: z.string().trim().min(3, 'Email atau No. WhatsApp wajib diisi').max(160),
})

const OTP_TTL_MINUTES = 10

/** Step 1 of 2: request a 6-digit OTP for the registered email / WhatsApp. */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Format permintaan tidak valid' }, { status: 400 })
  }

  const parsed = forgotSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message || 'Data tidak valid' },
      { status: 400 }
    )
  }

  const account = await findPatientAccountByIdentifier(parsed.data.identifier)

  // Same answer for unknown identifiers: no account enumeration.
  const genericResponse = {
    success: true,
    message:
      'Jika akun terdaftar, kode OTP 6 digit sudah kami siapkan dan berlaku selama 10 menit.',
  }
  if (!account) return NextResponse.json(genericResponse)

  const otp = crypto.randomInt(100000, 1000000).toString()
  await prisma.patientAccount.update({
    where: { id: account.id },
    data: {
      resetTokenHash: hashResetToken(otp),
      resetTokenExpiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      resetAttempts: 0,
    },
  })

  let emailSent = false
  if (process.env.RESEND_API_KEY && account.email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { error } = await resend.emails.send({
        from: 'Salsa Dental Clinic <noreply@salsadental.com>',
        to: [account.email],
        subject: 'Kode OTP Pemulihan Kata Sandi — Salsa Dental Clinic',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #FAF7F5; border-radius: 16px;">
            <h2 style="color: #8B4F4F; margin: 0 0 12px;">Pemulihan Kata Sandi</h2>
            <p style="color: #221A1B;">Halo <strong>${account.patient.name}</strong>,</p>
            <p style="color: #6A5557; line-height: 1.7;">
              Gunakan kode OTP berikut untuk melanjutkan pengaturan kata sandi baru.
              Kode berlaku ${OTP_TTL_MINUTES} menit dan hanya dapat dipakai satu kali.
            </p>
            <p style="margin: 22px 0; font-size: 34px; letter-spacing: 10px; font-weight: 700; color: #8B4F4F;">${otp}</p>
            <p style="color: #968082; font-size: 12px; line-height: 1.6;">
              Abaikan email ini bila Anda tidak meminta pemulihan kata sandi.
            </p>
            <p style="color: #968082; font-size: 11px; margin-top: 24px;">Salsabila Dental Clinic · 0813 8753 0407</p>
          </div>
        `,
      })
      emailSent = !error
      if (error) console.error('[patient OTP] Resend error:', error)
    } catch (error) {
      console.error('[patient OTP] gagal mengirim email:', error)
    }
  }

  // Prototype mode: without email credentials the OTP is returned so the
  // two-step flow stays testable. Disable with PATIENT_DEMO_ENABLED=false.
  const demoOtp = !emailSent && isDemoEnabled() ? otp : undefined

  return NextResponse.json({
    ...genericResponse,
    emailSent,
    ...(demoOtp ? { demoOtp } : {}),
  })
}

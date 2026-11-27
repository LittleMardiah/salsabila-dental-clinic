export const dynamic = 'force-dynamic'
// First click may provision the demo patient + EMR on a fresh database.
export const maxDuration = 60

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ensureDemoAccount, isDemoEnabled } from '@/lib/portal-demo'
import {
  isPortalAuthConfigured,
  patientCookieOptions,
  PATIENT_SESSION_COOKIE,
  signPatientSession,
} from '@/lib/portal-auth'
import { consumeRateLimit, ipRateLimitKey, tooManyRequests } from '@/lib/rate-limit'

const DEMO_IP_RULE = { limit: 10, windowSeconds: 10 * 60 }

const demoSchema = z.object({
  persona: z.enum(['new', 'history']),
})

/** Quick access to the two seeded test accounts (prototype phase only). */
export async function GET() {
  return NextResponse.json({
    success: true,
    enabled: isDemoEnabled(),
    accounts: DEMO_ACCOUNTS.map((account) => ({
      ...account,
      password: DEMO_PASSWORD,
    })),
  })
}

function withSession(
  account: { id: number; email: string; sessionVersion: number },
  patient: { id: number; name: string }
) {
  const response = NextResponse.json({
    success: true,
    patient: { id: patient.id, name: patient.name, email: account.email },
  })
  response.cookies.set(
    PATIENT_SESSION_COOKIE,
    signPatientSession(account.id, patient.id, account.sessionVersion),
    patientCookieOptions()
  )
  return response
}

export async function POST(request: Request) {
  if (!isPortalAuthConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Layanan autentikasi belum siap. Hubungi Admin klinik.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const ipLimit = await consumeRateLimit(ipRateLimitKey('demo', request), DEMO_IP_RULE)
  if (!ipLimit.allowed) return tooManyRequests(ipLimit)

  if (!isDemoEnabled()) {
    return NextResponse.json({ success: false, error: 'Akun demo dinonaktifkan pada lingkungan ini.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Format permintaan tidak valid' }, { status: 400 })
  }

  const parsed = demoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Persona demo tidak valid' }, { status: 400 })
  }

  const persona = parsed.data.persona
  const definition = DEMO_ACCOUNTS.find((item) => item.persona === persona)!

  try {
    const { account, patient } = await ensureDemoAccount(persona)
    return withSession(account, patient)
  } catch (error) {
    console.error('[POST /api/portal/auth/demo] gagal menyiapkan akun demo:', error)

    // The seeded account usually still exists even when a demo-data refresh
    // failed; signing in keeps "Isi cepat akun demo" usable.
    const fallback = await prisma.patientAccount
      .findUnique({
        where: { email: definition.email },
        include: { patient: true },
      })
      .catch(() => null)

    if (fallback?.patient) {
      return withSession(fallback, fallback.patient)
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Akun demo belum siap. Jalankan seed data lalu coba lagi.',
      },
      { status: 500 }
    )
  }
}

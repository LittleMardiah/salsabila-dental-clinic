export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  ensureDemoAccount,
  isDemoEnabled,
} from '@/lib/portal-demo'
import {
  patientCookieOptions,
  PATIENT_SESSION_COOKIE,
  signPatientSession,
} from '@/lib/portal-auth'

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

export async function POST(request: Request) {
  if (!isDemoEnabled()) {
    return NextResponse.json(
      { success: false, error: 'Akun demo dinonaktifkan pada lingkungan ini.' },
      { status: 403 }
    )
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

  try {
    const { account, patient } = await ensureDemoAccount(parsed.data.persona)
    const response = NextResponse.json({
      success: true,
      patient: { id: patient.id, name: patient.name, email: account.email },
    })
    response.cookies.set(
      PATIENT_SESSION_COOKIE,
      signPatientSession(account.id, patient.id),
      patientCookieOptions()
    )
    return response
  } catch (error) {
    console.error('[POST /api/portal/auth/demo] gagal menyiapkan akun demo:', error)
    return NextResponse.json(
      { success: false, error: 'Akun demo belum siap. Coba lagi beberapa saat lagi.' },
      { status: 500 }
    )
  }
}

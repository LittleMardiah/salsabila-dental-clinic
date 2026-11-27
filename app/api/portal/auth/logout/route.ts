export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { PATIENT_SESSION_COOKIE } from '@/lib/portal-auth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(PATIENT_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}

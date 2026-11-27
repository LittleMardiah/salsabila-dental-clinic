export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  clearPatientCookieOptions,
  PATIENT_SESSION_COOKIE,
  verifyPatientSessionToken,
} from '@/lib/portal-auth'

function readSessionToken(request: Request): string | null {
  const header = request.headers.get('cookie') || ''
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    if (trimmed.slice(0, eq).trim() === PATIENT_SESSION_COOKIE) {
      return trimmed.slice(eq + 1).trim() || null
    }
  }
  return null
}

export async function POST(request: Request) {
  const token = readSessionToken(request)
  const session = token ? verifyPatientSessionToken(token) : null

  // Revoke every token issued for this account, not just the browser cookie.
  // A copied cookie therefore stops working immediately after logout.
  if (session) {
    await prisma.patientAccount
      .update({
        where: { id: session.accountId },
        data: { sessionVersion: { increment: 1 } },
      })
      .catch((error) => {
        console.error('[POST /api/portal/auth/logout] gagal mencabut sesi:', error)
      })
  }

  const response = NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } }
  )
  response.cookies.set(PATIENT_SESSION_COOKIE, '', clearPatientCookieOptions())
  return response
}

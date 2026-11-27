import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export const PATIENT_SESSION_COOKIE = 'patient_session'
export const PATIENT_SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export type PatientSessionPayload = {
  accountId: number
  patientId: number
  role: 'patient_account'
}

function getSecret(): string | null {
  return process.env.JWT_SECRET || null
}

export function signPatientSession(accountId: number, patientId: number): string {
  const secret = getSecret()
  if (!secret) throw new Error('JWT_SECRET is not defined')
  return jwt.sign({ accountId, patientId, role: 'patient_account' }, secret, {
    algorithm: 'HS256',
    expiresIn: PATIENT_SESSION_MAX_AGE,
  })
}

export function verifyPatientSessionToken(token: string): PatientSessionPayload | null {
  const secret = getSecret()
  if (!secret) return null
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] })
    if (typeof decoded !== 'object' || decoded === null) return null
    const payload = decoded as Record<string, unknown>
    if (payload.role !== 'patient_account') return null
    if (typeof payload.accountId !== 'number' || typeof payload.patientId !== 'number') return null
    return {
      accountId: payload.accountId,
      patientId: payload.patientId,
      role: 'patient_account',
    }
  } catch {
    return null
  }
}

function parseCookieHeader(header: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (!header) return result
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return result
}

/** For API route handlers. Returns a 401-ready result instead of throwing. */
export async function requirePatientSession(request: Request): Promise<
  | { valid: true; session: PatientSessionPayload }
  | { valid: false; error: string; status: number }
> {
  const headerCookie = parseCookieHeader(request.headers.get('cookie') || '')[PATIENT_SESSION_COOKIE]
  const token = headerCookie || null
  if (!token) {
    return { valid: false, error: 'Sesi pasien tidak ditemukan. Silakan masuk kembali.', status: 401 }
  }
  const session = verifyPatientSessionToken(token)
  if (!session) {
    return { valid: false, error: 'Sesi pasien sudah berakhir. Silakan masuk kembali.', status: 401 }
  }
  return { valid: true, session }
}

/** For server components / layouts. */
export function getPatientSessionFromCookies(): PatientSessionPayload | null {
  const token = cookies().get(PATIENT_SESSION_COOKIE)?.value
  if (!token) return null
  return verifyPatientSessionToken(token)
}

export function patientCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: PATIENT_SESSION_MAX_AGE,
    path: '/',
  }
}

const RESET_TICKET_TTL_SECONDS = 15 * 60

/** Short-lived, stateless proof that the OTP step succeeded. */
export function signPatientResetTicket(accountId: number): string {
  const secret = getSecret()
  if (!secret) throw new Error('JWT_SECRET is not defined')
  return jwt.sign({ accountId, purpose: 'patient_password_reset' }, secret, {
    algorithm: 'HS256',
    expiresIn: RESET_TICKET_TTL_SECONDS,
  })
}

export function verifyPatientResetTicket(ticket: string): number | null {
  const secret = getSecret()
  if (!secret) return null
  try {
    const decoded = jwt.verify(ticket, secret, { algorithms: ['HS256'] })
    if (typeof decoded !== 'object' || decoded === null) return null
    const payload = decoded as Record<string, unknown>
    if (payload.purpose !== 'patient_password_reset') return null
    return typeof payload.accountId === 'number' ? payload.accountId : null
  } catch {
    return null
  }
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function normalizePhone(value: string | null | undefined): string {
  return (value || '').replace(/\D/g, '')
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export { isPasswordAcceptable, passwordChecks } from '@/lib/password-policy'

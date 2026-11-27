import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const PATIENT_SESSION_COOKIE = 'patient_session'
/** Shortened from 30 days: leaked cookies expire faster and logout revokes them. */
export const PATIENT_SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

const MIN_PRODUCTION_SECRET_LENGTH = 32

export type PatientSessionPayload = {
  accountId: number
  patientId: number
  sessionVersion: number
  role: 'patient_account'
}

let warnedAboutSecret = false

function warnSecretOnce() {
  if (warnedAboutSecret) return
  warnedAboutSecret = true
  console.error(
    '[portal-auth] JWT_SECRET tidak tersedia atau terlalu lemah untuk production (minimal 32 karakter). ' +
      'Sesi pasien, OTP, dan reset ticket tidak akan diterbitkan sampai secret diperbaiki.'
  )
}

/**
 * Returns null when the signing secret is missing/weak so callers can fail
 * closed without ever logging or exposing the secret itself.
 */
function getSecret(): string | null {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret) {
    warnSecretOnce()
    return null
  }
  if (process.env.NODE_ENV === 'production' && secret.length < MIN_PRODUCTION_SECRET_LENGTH) {
    warnSecretOnce()
    return null
  }
  return secret
}

/** Used by auth routes to return a safe 503 instead of a 500 stack trace. */
export function isPortalAuthConfigured(): boolean {
  return getSecret() !== null
}

export function signPatientSession(accountId: number, patientId: number, sessionVersion: number): string {
  const secret = getSecret()
  if (!secret) throw new Error('Portal auth is not configured')
  return jwt.sign({ accountId, patientId, sessionVersion, role: 'patient_account' }, secret, {
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
    if (
      typeof payload.accountId !== 'number' ||
      typeof payload.patientId !== 'number' ||
      typeof payload.sessionVersion !== 'number' ||
      !Number.isInteger(payload.sessionVersion) ||
      payload.sessionVersion < 0
    ) {
      return null
    }
    return {
      accountId: payload.accountId,
      patientId: payload.patientId,
      sessionVersion: payload.sessionVersion,
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

async function sessionStillValid(session: PatientSessionPayload): Promise<boolean> {
  try {
    const account = await prisma.patientAccount.findUnique({
      where: { id: session.accountId },
      select: { patientId: true, sessionVersion: true },
    })
    return Boolean(
      account &&
        account.patientId === session.patientId &&
        account.sessionVersion === session.sessionVersion
    )
  } catch (error) {
    console.error('[portal-auth] gagal memeriksa versi sesi:', error)
    return false
  }
}

/** For API route handlers. Returns a 401-ready result instead of throwing. */
export async function requirePatientSession(request: Request): Promise<
  | { valid: true; session: PatientSessionPayload }
  | { valid: false; error: string; status: number }
> {
  const token = parseCookieHeader(request.headers.get('cookie') || '')[PATIENT_SESSION_COOKIE]
  if (!token) {
    return { valid: false, error: 'Sesi pasien tidak ditemukan. Silakan masuk kembali.', status: 401 }
  }

  const session = verifyPatientSessionToken(token)
  if (!session) {
    return { valid: false, error: 'Sesi pasien sudah berakhir. Silakan masuk kembali.', status: 401 }
  }

  // Logout and password reset bump sessionVersion, so stolen/old cookies stop
  // working immediately instead of remaining valid for the token lifetime.
  if (!(await sessionStillValid(session))) {
    return { valid: false, error: 'Sesi pasien sudah berakhir. Silakan masuk kembali.', status: 401 }
  }

  return { valid: true, session }
}

/** For server components / layouts. Signature-only; prefer the verified variant. */
export function getPatientSessionFromCookies(): PatientSessionPayload | null {
  const token = cookies().get(PATIENT_SESSION_COOKIE)?.value
  if (!token) return null
  return verifyPatientSessionToken(token)
}

export async function getVerifiedPatientSessionFromCookies(): Promise<PatientSessionPayload | null> {
  const session = getPatientSessionFromCookies()
  if (!session) return null
  return (await sessionStillValid(session)) ? session : null
}

type CookieOverrides = {
  maxAge?: number
  expires?: Date
}

export function patientCookieOptions(overrides: CookieOverrides = {}) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: overrides.maxAge ?? PATIENT_SESSION_MAX_AGE,
    ...(overrides.expires ? { expires: overrides.expires } : {}),
    path: '/',
  }
}

export function clearPatientCookieOptions() {
  return patientCookieOptions({ maxAge: 0, expires: new Date(0) })
}

export const RESET_TICKET_TTL_SECONDS = 15 * 60

/** Short-lived, stateless proof that the OTP step succeeded. */
export function signPatientResetTicket(accountId: number): string {
  const secret = getSecret()
  if (!secret) throw new Error('Portal auth is not configured')
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

/**
 * HMAC-SHA256 keyed by the server secret. A plain 6-digit SHA-256 hash is
 * trivially reversible offline if the database leaks; this is not.
 */
export function hashResetToken(token: string): string {
  const secret = getSecret()
  if (!secret) throw new Error('Portal auth is not configured')
  return crypto
    .createHmac('sha256', secret)
    .update(`patient-reset-token:${token}`)
    .digest('hex')
}

export function normalizePhone(value: string | null | undefined): string {
  return (value || '').replace(/\D/g, '')
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export { isPasswordAcceptable, passwordChecks } from '@/lib/password-policy'

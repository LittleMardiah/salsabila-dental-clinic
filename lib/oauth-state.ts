import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto'

export type OAuthStateReason =
  | 'missing_state'
  | 'invalid_state'
  | 'expired_state'
  | 'unauthorized'
  | 'state_mismatch'
  | 'access_denied'
  | 'oauth_failed'
  | 'temporarily_unavailable'
  | 'missing_code'
  | 'token_exchange_failed'
  | 'server_error'

type OAuthStatePayload = {
  v: 1
  admin: string
  session: string
  sessionExp: number
  iat: number
  exp: number
  nonce: string
  verifier: string
}

export type OAuthState = OAuthStatePayload

const STATE_TTL_MS = 10 * 60 * 1000
const CLOCK_SKEW_MS = 60 * 1000
const PREFIX = 'sds1'

function getSecret(): string {
  const secret = process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.JWT_SECRET
  if (!secret) throw new Error('OAuth state secret tidak tersedia')
  return secret
}

function getKey(): Buffer {
  return createHash('sha256').update(getSecret()).digest()
}

function sign(value: string): string {
  return createHmac('sha256', getKey()).update(value).digest('base64url')
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 32)
}

export function buildGoogleSettingsUrl(
  baseUrl: string,
  outcome: { connected: true } | { reason: OAuthStateReason }
): string {
  const params = new URLSearchParams({ tab: 'pengaturan' })
  if ('connected' in outcome) {
    params.set('google_sync', 'connected')
    params.set('connected', 'true')
  } else {
    params.set('google_sync', 'error')
    params.set('reason', outcome.reason)
    params.set('error', outcome.reason)
  }
  return `${baseUrl.replace(/\/$/, '')}/admin/dashboard?${params.toString()}`
}

export function getAdminTokenCookieValue(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie') || ''
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === 'token' && rest.length > 0) {
      return rest.join('=')
    }
  }
  return null
}

export function getAdminSessionIdFromRequest(request: Request): string | null {
  const token = getAdminTokenCookieValue(request)
  return token ? hashSessionToken(token) : null
}

export function createOAuthState(
  admin: string,
  sessionId: string,
  sessionExp: number
): { state: string; codeChallenge: string } {
  const now = Date.now()
  const verifier = randomBytes(32).toString('base64url')
  const payload: OAuthStatePayload = {
    v: 1,
    admin,
    session: sessionId,
    sessionExp,
    iat: now,
    exp: now + STATE_TTL_MS,
    nonce: randomBytes(16).toString('hex'),
    verifier,
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ])
  const body = [
    PREFIX,
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
  ].join('.')

  return {
    state: `${body}.${sign(body)}`,
    codeChallenge: createHash('sha256').update(verifier).digest('base64url'),
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function verifyOAuthState(
  raw: string | null
): { valid: true; state: OAuthState } | { valid: false; reason: OAuthStateReason } {
  if (!raw) return { valid: false, reason: 'missing_state' }

  const parts = raw.split('.')
  if (parts.length !== 5) return { valid: false, reason: 'invalid_state' }
  const [prefix, ivPart, ciphertextPart, tagPart, signature] = parts
  if (prefix !== PREFIX) return { valid: false, reason: 'invalid_state' }

  const signedBody = parts.slice(0, 4).join('.')
  if (!safeEqual(signature, sign(signedBody))) {
    return { valid: false, reason: 'invalid_state' }
  }

  try {
    const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivPart, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
    const plain = Buffer.concat([
      decipher.update(Buffer.from(ciphertextPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
    const payload = JSON.parse(plain) as Partial<OAuthStatePayload>
    const now = Date.now()

    if (
      payload.v !== 1 ||
      typeof payload.admin !== 'string' ||
      payload.admin.length === 0 ||
      typeof payload.session !== 'string' ||
      !/^[a-f0-9]{32}$/.test(payload.session) ||
      typeof payload.nonce !== 'string' ||
      payload.nonce.length !== 32 ||
      typeof payload.verifier !== 'string' ||
      payload.verifier.length < 32 ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number' ||
      typeof payload.sessionExp !== 'number'
    ) {
      return { valid: false, reason: 'invalid_state' }
    }
    if (payload.iat > now + CLOCK_SKEW_MS || payload.exp <= now || payload.exp - payload.iat > STATE_TTL_MS) {
      return { valid: false, reason: 'expired_state' }
    }
    if (payload.sessionExp <= now) {
      return { valid: false, reason: 'expired_state' }
    }

    return { valid: true, state: payload as OAuthState }
  } catch {
    return { valid: false, reason: 'invalid_state' }
  }
}

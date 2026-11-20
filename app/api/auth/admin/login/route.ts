export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { RateLimit } from '@/lib/middleware/RateLimiter'
import { addAuditLog } from '@/lib/services/audit.service'
import {
  ADMIN_AUTH_LEVEL,
  DEFAULT_ADMIN_USERNAME,
  isVaultTokenPayload,
} from '@/lib/admin-auth'

// Fallback bcrypt (cost 10) untuk kredensial awal admin/Meiharti_2490.
// Produksi tetap dapat menimpa lewat ADMIN_PASSWORD_HASH_BASE64.
const DEFAULT_ADMIN_PASSWORD_HASH_BASE64 =
  'JDJiJDEwJFBwenRXS1U1cmhOTDNlRS9yaUZkd3VhQXlCUnNwdVpUSVRNa0ZVb2RITmJwNXVyejVweDc2'

const loginSchema = z.object({
  username: z.string().trim().min(3, 'Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const firstEq = trimmed.indexOf('=')
    if (firstEq === -1) continue
    const key = trimmed.slice(0, firstEq).trim()
    const value = trimmed.slice(firstEq + 1).trim()
    if (key) cookies[key] = value
  }
  return cookies
}

function resolvePasswordHash(): string {
  const encoded = process.env.ADMIN_PASSWORD_HASH_BASE64?.trim()
  if (encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8').trim()
    if (decoded.length !== 60 || !decoded.startsWith('$2')) {
      throw new Error('ADMIN_PASSWORD_HASH_BASE64 tidak valid')
    }
    return decoded
  }

  const raw = process.env.ADMIN_PASSWORD_HASH?.trim()
  if (raw) {
    if (raw.length !== 60 || !raw.startsWith('$2')) {
      throw new Error('ADMIN_PASSWORD_HASH tidak valid')
    }
    return raw
  }

  return Buffer.from(DEFAULT_ADMIN_PASSWORD_HASH_BASE64, 'base64').toString('utf8')
}

function resolveAdminUsernames(): string[] {
  const configured = process.env.ADMIN_USERNAME?.trim()
  if (!configured) return [DEFAULT_ADMIN_USERNAME]
  const usernames = configured
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return usernames.length > 0 ? usernames : [DEFAULT_ADMIN_USERNAME]
}

/**
 * @openapi
 * /api/auth/admin/login:
 *   post:
 *     summary: Login admin (lapis 2)
 *     description: Memerlukan cookie vault bertanda tangan dari endpoint verify-code.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: "********"
 *     responses:
 *       200:
 *         description: Login berhasil, token admin disimpan di cookie
 *       401:
 *         description: Username atau password salah
 *       403:
 *         description: Kode verifikasi belum diberikan atau sudah expired
 *       429:
 *         description: Terlalu banyak percobaan
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('remote-addr') ||
    'unknown'
  const rateLimit = RateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Too many attempts. Try again in ${Math.ceil(rateLimit.resetAfterSeconds)} seconds.`,
      },
      { status: 429 }
    )
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    console.error('JWT_SECRET tidak diset di environment')
    return NextResponse.json(
      { success: false, error: 'Server config error' },
      { status: 500 }
    )
  }

  const cookies = parseCookies(request.headers.get('cookie') || '')
  const vaultCookie = cookies.admin_code_verified
  if (!vaultCookie) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Verification code required. Please go back and enter the 8-digit code first.',
      },
      { status: 403 }
    )
  }

  let vaultValid = false
  try {
    const vaultPayload = jwt.verify(vaultCookie, jwtSecret, {
      algorithms: ['HS256'],
    })
    vaultValid = isVaultTokenPayload(vaultPayload)
  } catch {
    vaultValid = false
  }

  if (!vaultValid) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Verification code required. Please go back and enter the 8-digit code first.',
      },
      { status: 403 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { username, password } = parsed.data

  if (!resolveAdminUsernames().includes(username)) {
    return NextResponse.json(
      { success: false, error: 'Invalid username or password' },
      { status: 401 }
    )
  }

  let passwordHash: string
  try {
    passwordHash = resolvePasswordHash()
  } catch (error) {
    console.error('Konfigurasi password admin tidak valid:', error)
    return NextResponse.json(
      { success: false, error: 'Server config error' },
      { status: 500 }
    )
  }

  const isValidPassword = await bcrypt.compare(password, passwordHash)
  if (!isValidPassword) {
    return NextResponse.json(
      { success: false, error: 'Invalid username or password' },
      { status: 401 }
    )
  }

  // authLevel 2 menandai bahwa token hanya terbit setelah vault + kredensial
  // sama-sama lolos. Token lama tanpa klaim ini otomatis ditolak guard.
  const token = jwt.sign(
    { username, role: 'admin', authLevel: ADMIN_AUTH_LEVEL },
    jwtSecret,
    { expiresIn: '24h', algorithm: 'HS256' }
  )

  const response = NextResponse.json({
    success: true,
    message: 'Login berhasil',
    redirectTo: '/admin/dashboard',
  })

  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400,
    path: '/',
  })

  response.cookies.delete('admin_code_verified')

  await addAuditLog(username, 'LOGIN', 'admin', username, {}, ip)

  return response
}

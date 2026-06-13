export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { RateLimit } from '@/lib/middleware/RateLimiter'
import { addAuditLog } from '@/lib/services/audit.service' 

const loginSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

/**
 * @openapi
 * /api/auth/admin/login:
 *   post:
 *     summary: Login admin (lapis 2)
 *     description: Memerlukan cookie `admin_code_verified` dari endpoint verify-code.
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
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login berhasil, token disimpan di cookie
 *       401:
 *         description: Username atau password salah
 *       403:
 *         description: Kode verifikasi belum diberikan atau sudah expired
 *       429:
 *         description: Terlalu banyak percobaan
 */
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('remote-addr') || 'unknown'
  const rateLimit = RateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: `Too many attempts. Try again in ${Math.ceil(rateLimit.resetAfterSeconds)} seconds.` },
      { status: 429 }
    )
  }

  const cookieHeader = request.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(cookie => {
      const [key, ...rest] = cookie.split('=')
      return [key, rest.join('=')]
    })
  )

  if (cookies.admin_code_verified !== 'true') {
    return NextResponse.json(
      { success: false, error: 'Verification code required. Please go back and enter the 8-digit code first.' },
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

  const rawAdminUsernames = process.env.ADMIN_USERNAME || ''
  const adminUsernames = rawAdminUsernames.split(',').map(u => u.trim())
  const isValidUsername = adminUsernames.includes(username)

  if (!isValidUsername) {
    return NextResponse.json(
      { success: false, error: 'Invalid username or password' },
      { status: 401 }
    )
  }

  const hashBase64 = process.env.ADMIN_PASSWORD_HASH_BASE64
  if (!hashBase64) {
    console.error('ADMIN_PASSWORD_HASH_BASE64 missing')
    return NextResponse.json({ success: false, error: 'Server config error' }, { status: 500 })
  }

  const passwordHash = Buffer.from(hashBase64, 'base64').toString('utf8')
  if (passwordHash.length !== 60) {
    console.error('Invalid hash length after decode:', passwordHash.length)
    return NextResponse.json({ success: false, error: 'Server config error' }, { status: 500 })
  }

  const isValidPassword = await bcrypt.compare(password, passwordHash)
  if (!isValidPassword) {
    return NextResponse.json(
      { success: false, error: 'Invalid username or password' },
      { status: 401 }
    )
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return NextResponse.json({ success: false, error: 'Server config error' }, { status: 500 })
  }

  const token = jwt.sign({ username, role: 'admin' }, jwtSecret, { expiresIn: '24h' })

  const response = NextResponse.json({
    success: true,
    message: 'Login berhasil',
    redirectTo: '/admin/queue',
  })

  response.cookies.set('token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 86400,
    path: '/',
  })

  response.cookies.delete('admin_code_verified')

  await addAuditLog(username, 'LOGIN', 'admin', username, {}, ip)

  return response
}
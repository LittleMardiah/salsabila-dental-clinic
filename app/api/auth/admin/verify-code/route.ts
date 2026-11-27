export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { RateLimit } from '@/lib/middleware/RateLimiter'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { timingSafeEqual } from 'crypto'
import {
  resolveAdminAccessCode,
  type VaultTokenPayload,
} from '@/lib/admin-auth'

const verifyCodeSchema = z
  .object({
    code: z
      .string()
      .regex(/^\d{8}$/, { message: 'Kode vault harus 8 digit angka' }),
  })
  .strict('Data verifikasi tidak valid')

function safeEqual(value: string, expected: string): boolean {
  const valueBuffer = Buffer.from(value)
  const expectedBuffer = Buffer.from(expected)
  if (valueBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(valueBuffer, expectedBuffer)
}

/**
 * @openapi
 * /api/auth/admin/verify-code:
 *   post:
 *     summary: Verifikasi kode vault 8 digit (lapis 1 login admin)
 *     description: Memverifikasi kode akses admin dari environment (wajib di production). Jika benar, cookie vault bertanda tangan akan diset selama 5 menit.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 length: 8
 *                 example: "********"
 *     responses:
 *       200:
 *         description: Kode valid, cookie vault diset
 *       401:
 *         description: Kode salah
 *       429:
 *         description: Terlalu banyak percobaan
 *       400:
 *         description: Input tidak valid
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = verifyCodeSchema.safeParse(body)
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = RateLimit(ip)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many attempts. Please try again in ${rateLimitResult.resetAfterSeconds} seconds.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimitResult.resetAfterSeconds) },
        }
      )
    }

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Kode vault harus 8 digit angka', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { code } = parsed.data
    const adminAccessCode = resolveAdminAccessCode()
    if (!adminAccessCode) {
      console.error('[admin verify-code] ADMIN_ACCESS_CODE belum dikonfigurasi')
      return NextResponse.json(
        { success: false, error: 'Konfigurasi server error' },
        { status: 503 }
      )
    }

    let isValid = false
    if (adminAccessCode.startsWith('$2a$') || adminAccessCode.startsWith('$2b$') || adminAccessCode.startsWith('$2y$')) {
      isValid = await bcrypt.compare(code, adminAccessCode)
    } else {
      isValid = safeEqual(code, adminAccessCode)
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid access code' },
        { status: 401 }
      )
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET tidak diset di environment')
      return NextResponse.json(
        { success: false, error: 'Konfigurasi server error' },
        { status: 500 }
      )
    }

    // Cookie vault bertanda tangan: nilai "true" atau cookie buatan klien
    // tidak dapat dipakai untuk melewati Layer 2.
    const vaultToken = jwt.sign(
      { role: 'admin_vault', scope: 'admin_vault' } satisfies Omit<VaultTokenPayload, 'iat' | 'exp'>,
      jwtSecret,
      { expiresIn: '5m' }
    )

    const response = NextResponse.json({
      success: true,
      message: 'Kode valid, silakan login',
    })

    response.cookies.set('admin_code_verified', vaultToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 300,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error in verify-code:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

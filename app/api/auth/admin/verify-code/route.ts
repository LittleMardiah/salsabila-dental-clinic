export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { RateLimit } from '@/lib/middleware/RateLimiter'
import { z } from 'zod'
import bcrypt from 'bcrypt'

const verifyCodeSchema = z.object({
  code: z.string().length(8, { message: 'Kode harus 8 digit' })
})

/**
 * @openapi
 * /api/auth/admin/verify-code:
 *   post:
 *     summary: Verifikasi kode 8 digit (lapis 1 login admin)
 *     description: Memverifikasi kode akses admin yang disimpan di .env. Jika benar, cookie `admin_code_verified` akan diset selama 5 menit.
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
 *                 example: "12345678"
 *     responses:
 *       200:
 *         description: Kode valid, cookie diset
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
      { success: false, error: `Too many attempts. Please try again in ${rateLimitResult.resetAfterSeconds} seconds.` },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.resetAfterSeconds) } }
    )
  }
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Input tidak valid', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { code } = parsed.data
    const adminAccessCode = process.env.ADMIN_ACCESS_CODE

    if (!adminAccessCode) {
      console.error('ADMIN_ACCESS_CODE tidak diset di environment')
      return NextResponse.json(
        { success: false, error: 'Konfigurasi server error' },
        { status: 500 }
      )
    }

    let isValid = false
    if (adminAccessCode.startsWith('$2b$')) {
      isValid = await bcrypt.compare(code, adminAccessCode)
    } else {
      isValid = code === adminAccessCode
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid access code' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      success: true,
      message: 'Kode valid, silakan login'
    })

    response.cookies.set('admin_code_verified', 'true', {
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
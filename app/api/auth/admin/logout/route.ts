export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { addAuditLog } from '@/lib/services/audit.service' 

/**
 * @openapi
 * /api/auth/admin/logout:
 *   post:
 *     summary: Admin logout
 *     description: Menghapus cookie token dan mencatat logout.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout berhasil
 */
export async function POST(request: Request) {
  let username = 'unknown'
  const cookieHeader = request.headers.get('cookie') || ''
  const tokenMatch = cookieHeader.match(/token=([^;]+)/)
  if (tokenMatch) {
    try {
      const decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET!) as any
      username = decoded.username
    } catch (e) {}
  }

  const response = NextResponse.json({
    success: true,
    message: 'Logout berhasil',
  })

  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: -1,
    path: '/',
  })
  response.cookies.delete('admin_code_verified')

  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  await addAuditLog(username, 'LOGOUT', 'admin', username, {}, ip)

  return response
}
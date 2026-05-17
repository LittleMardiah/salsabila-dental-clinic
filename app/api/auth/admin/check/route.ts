// app/api/auth/admin/check/route.ts
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/ServerAuth'

/**
 * @openapi
 * /api/auth/admin/check:
 *   get:
 *     summary: Memeriksa status login admin
 *     description: Mengembalikan informasi admin yang sedang login (validitas token).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 username:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: Token tidak valid atau tidak ada
 */
export async function GET(request: Request) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
  }
  return NextResponse.json({ username: auth.username, role: 'admin' })
}
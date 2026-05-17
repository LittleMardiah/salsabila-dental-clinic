import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'

/**
 * @openapi
 * /api/backup/google-callback:
 *   get:
 *     summary: Callback OAuth Google Drive
 *     description: Menerima kode otorisasi dari Google, menukarnya dengan access token, dan menyimpan token ke database pengguna.
 *     tags: [Backup]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Kode otorisasi dari Google
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Pesan error jika ada
 *     responses:
 *       302:
 *         description: Redirect ke halaman backup dengan status
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  
  if (error) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/admin/backup?error=oauth_failed`)
  }
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/admin/backup?error=missing_code`)
  }

  // Verifikasi admin (ambil dari cookie)
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/admin/backup?error=unauthorized`)
  }

  // Tukar code dengan access token dan refresh token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/backup/google-callback`,
      grant_type: 'authorization_code',
    }),
  })
  const tokens = await tokenResponse.json()
  
  if (tokens.error) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/admin/backup?error=token_exchange_failed`)
  }

  // Simpan token ke database (AdminPreference)
  await prisma.adminPreference.upsert({
    where: { adminId: auth.username! },
    update: {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
    },
    create: {
      adminId: auth.username!,
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      hiddenMenus: [],
    },
  })

  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/admin/backup?connected=true`)
}
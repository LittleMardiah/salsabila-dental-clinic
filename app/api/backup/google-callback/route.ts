export const dynamic = 'force-dynamic'

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
 *         description: Redirect ke halaman pengaturan dengan status
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  
  const baseUrl = 'https://salsabila-dental-clinic.vercel.app'
  const baseRedirect = `${baseUrl}/admin/settings`

  if (error) {
    console.error('[OAuth Callback] Error dari Google:', error)
    return NextResponse.redirect(`${baseRedirect}?error=oauth_failed`)
  }
  if (!code) {
    console.error('[OAuth Callback] Tidak ada kode otorisasi')
    return NextResponse.redirect(`${baseRedirect}?error=missing_code`)
  }

  // Verifikasi admin (ambil dari cookie)
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    console.error('[OAuth Callback] Admin tidak terautentikasi')
    return NextResponse.redirect(`${baseRedirect}?error=unauthorized`)
  }

  console.log('[OAuth Callback] Admin', auth.username, 'memulai pertukaran token')

  // Tukar code dengan access token dan refresh token
  const redirectUri = `${baseUrl}/api/backup/google-callback`
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const tokens = await tokenResponse.json()
  
  if (tokens.error) {
    console.error('[OAuth Callback] Gagal tukar token:', tokens.error)
    return NextResponse.redirect(`${baseRedirect}?error=token_exchange_failed`)
  }

  console.log('[OAuth Callback] Token berhasil diperoleh, menyimpan ke database')

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

  console.log('[OAuth Callback] Token tersimpan, redirect ke', baseRedirect)
  return NextResponse.redirect(`${baseRedirect}?connected=true`)
}
// app/api/backup/google-auth/route.ts
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

/**
 * @openapi
 * /api/backup/google-auth:
 *   get:
 *     summary: Redirect ke Google OAuth untuk otorisasi Drive
 *     description: Memulai alur OAuth 2.0 untuk mendapatkan akses ke Google Drive.
 *     tags: [Backup]
 *     responses:
 *       302:
 *         description: Redirect ke halaman otorisasi Google
 */
export async function GET() {
  // ✅ PERBAIKAN: Hardcode sementara untuk memastikan tidak ada kesalahan dinamis
  // Ganti dengan domain Anda yang sebenarnya
  const baseUrl = 'https://salsabila-dental-clinic.vercel.app'
  
  // Atau gunakan logika dinamis dengan fallback yang jelas
  // const baseUrl = process.env.VERCEL_URL 
  //   ? `https://${process.env.VERCEL_URL}`
  //   : process.env.NEXTAUTH_URL || 'http://localhost:3000'
  
  const redirectUri = `${baseUrl}/api/backup/google-callback`
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/drive.file&access_type=offline&prompt=consent`
  
  console.log('[Google Auth] Redirect URI:', redirectUri) 
  return NextResponse.redirect(authUrl)
}
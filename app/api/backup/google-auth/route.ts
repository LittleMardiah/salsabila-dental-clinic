export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { decode } from 'jsonwebtoken'
import { verifyAdminToken } from '@/lib/middleware/auth'
import {
  buildGoogleSettingsUrl,
  createOAuthState,
  getAdminSessionIdFromRequest,
  getAdminTokenCookieValue,
} from '@/lib/oauth-state'

/**
 * @openapi
 * /api/backup/google-auth:
 *   get:
 *     summary: Redirect ke Google OAuth untuk otorisasi Drive
 *     description: Memulai alur OAuth 2.0 (state terenkripsi + PKCE) untuk mendapatkan akses ke Google Drive.
 *     tags: [Backup]
 *     responses:
 *       302:
 *         description: Redirect ke halaman otorisasi Google
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    url.origin
  const settingsUrl = buildGoogleSettingsUrl(baseUrl, { reason: 'unauthorized' })

  let auth
  try {
    auth = await verifyAdminToken(request)
  } catch {
    return NextResponse.redirect(
      buildGoogleSettingsUrl(baseUrl, { reason: 'server_error' }),
      { status: 302 }
    )
  }
  if (!auth.valid || !auth.username) {
    return NextResponse.redirect(settingsUrl, { status: 302 })
  }

  const token = getAdminTokenCookieValue(request)
  const decoded = token ? decode(token) : null
  const sessionExp =
    decoded && typeof decoded === 'object' && typeof decoded.exp === 'number'
      ? decoded.exp * 1000
      : 0
  const sessionId = getAdminSessionIdFromRequest(request)
  if (!token || !sessionId || sessionExp <= Date.now()) {
    return NextResponse.redirect(settingsUrl, { status: 302 })
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${baseUrl.replace(/\/$/, '')}/api/backup/google-callback`

  const { state, codeChallenge } = createOAuthState(auth.username, sessionId, sessionExp)
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file',
    access_type: 'offline',
    prompt: 'consent',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(
      buildGoogleSettingsUrl(baseUrl, { reason: 'server_error' }),
      { status: 302 }
    )
  }

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    { status: 302 }
  )
}

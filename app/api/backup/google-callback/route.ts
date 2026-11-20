export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'
import {
  buildGoogleSettingsUrl,
  getAdminSessionIdFromRequest,
  verifyOAuthState,
  type OAuthStateReason,
} from '@/lib/oauth-state'

/**
 * @openapi
 * /api/backup/google-callback:
 *   get:
 *     summary: Callback OAuth Google Drive
 *     description: Memvalidasi state terenkripsi + PKCE, menukar kode otorisasi, lalu menyimpan token untuk admin yang sah.
 *     tags: [Backup]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Kode otorisasi dari Google
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State terenkripsi dari endpoint google-auth
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
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    url.origin
  const done = (reason?: OAuthStateReason) =>
    NextResponse.redirect(
      buildGoogleSettingsUrl(baseUrl, reason ? { reason } : { connected: true }),
      { status: 302 }
    )

  const stateResult = verifyOAuthState(url.searchParams.get('state'))
  if (!stateResult.valid) return done(stateResult.reason)
  const state = stateResult.state

  const oauthError = url.searchParams.get('error')
  if (oauthError) {
    const allowed: OAuthStateReason[] = [
      'access_denied',
      'oauth_failed',
      'server_error',
      'temporarily_unavailable',
    ]
    return done(
      allowed.includes(oauthError as OAuthStateReason)
        ? (oauthError as OAuthStateReason)
        : 'oauth_failed'
    )
  }

  const code = url.searchParams.get('code')
  if (!code) return done('missing_code')

  const cookieSession = getAdminSessionIdFromRequest(request)
  if (cookieSession) {
    try {
      const auth = await verifyAdminToken(request)
      if (!auth.valid || auth.username !== state.admin || cookieSession !== state.session) {
        return done('state_mismatch')
      }
    } catch {
      return done('server_error')
    }
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${baseUrl.replace(/\/$/, '')}/api/backup/google-callback`

  let tokens: {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error?: string
  }
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: state.verifier,
      }),
    })
    if (!tokenResponse.ok) return done('token_exchange_failed')
    tokens = await tokenResponse.json()
  } catch {
    return done('token_exchange_failed')
  }

  if (!tokens || tokens.error || typeof tokens.access_token !== 'string') {
    return done('token_exchange_failed')
  }

  try {
    const existing = await prisma.adminPreference.findUnique({
      where: { adminId: state.admin },
      select: { googleRefreshToken: true },
    })
    const refreshToken = tokens.refresh_token || existing?.googleRefreshToken || null
    const expiryMs =
      typeof tokens.expires_in === 'number' && Number.isFinite(tokens.expires_in)
        ? tokens.expires_in * 1000
        : 3600 * 1000

    await prisma.adminPreference.upsert({
      where: { adminId: state.admin },
      update: {
        googleAccessToken: tokens.access_token,
        ...(refreshToken ? { googleRefreshToken: refreshToken } : {}),
        googleTokenExpiry: new Date(Date.now() + expiryMs),
      },
      create: {
        adminId: state.admin,
        googleAccessToken: tokens.access_token,
        googleRefreshToken: refreshToken,
        googleTokenExpiry: new Date(Date.now() + expiryMs),
        hiddenMenus: [],
      },
    })
  } catch {
    return done('server_error')
  }

  return done()
}

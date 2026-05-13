import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

export type AdminPayload = {
  username: string
  role: 'admin'
  iat?: number
  exp?: number
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieHeader) return cookies
  cookieHeader.split(';').forEach(cookie => {
    const trimmed = cookie.trim()
    if (!trimmed) return
    const firstEq = trimmed.indexOf('=')
    if (firstEq === -1) return
    const key = trimmed.substring(0, firstEq).trim()
    const value = trimmed.substring(firstEq + 1).trim()
    cookies[key] = value
  })
  return cookies
}

export async function verifyAdminToken(request: Request): Promise<{ valid: boolean; error?: string; status?: number; username?: string }> {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment')
  }

  // Ambil cookie dari header request
  const cookieHeader = request.headers.get('cookie') || ''
  console.log('[verifyAdminToken] Raw cookie header:', cookieHeader) // ✅ Debug
  const cookies = parseCookies(cookieHeader)
  const token = cookies.token

  if (!token) {
    console.log('[verifyAdminToken] Token not found in cookies')
    return { valid: false, error: 'Unauthorized: No token provided', status: 401 }
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AdminPayload
    if (decoded.role !== 'admin') {
      return { valid: false, error: 'Forbidden', status: 403 }
    }
    return { valid: true, username: decoded.username }
  } catch (error) {
    console.error('[verifyAdminToken] JWT verification error:', error)
    return { valid: false, error: 'Invalid or expired token', status: 401 }
  }
}

export async function verifyPatientToken(request: Request | NextRequest): Promise<{
  valid: boolean
  queueId?: number
  error?: string
  status?: number
}> {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookies = parseCookies(cookieHeader)
  const token = cookies.patient_token
  if (!token) {
    return { valid: false, error: 'Authentication required', status: 401 }
  }
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return { valid: false, error: 'Server error', status: 500 }
  }
  try {
    const decoded = jwt.verify(token, jwtSecret) as { queueId: number; role: string }
    if (decoded.role !== 'patient') {
      return { valid: false, error: 'Access denied', status: 403 }
    }
    return { valid: true, queueId: decoded.queueId }
  } catch {
    return { valid: false, error: 'Invalid or expired token', status: 401 }
  }
}
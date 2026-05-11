import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAdminToken } from '@/lib/middleware/auth'
import jwt from 'jsonwebtoken'

// Daftar rute yang perlu dilindungi (admin endpoints)
const adminRoutes = [
  '/admin/:path*',           
  '/api/backup/:path*',
  '/api/queue/call',
  '/api/queue/:id/complete',
  '/api/patient/:id/emr',
  '/api/finance/:path*',
  '/api/audit-log',
]

function matchesAdminRoute(pathname: string): boolean {
  if (pathname.startsWith('/admin/') || pathname === '/admin') {
    return true
  }
  const specificPatterns = [
    '/api/backup',
    '/api/queue/call',
    '/api/queue/complete',
    '/api/patient/emr',
    '/api/finance',
    '/api/audit-log',
  ]
  for (const pattern of specificPatterns) {
    if (pathname.startsWith(pattern)) {
      return true
    }
  }
  return false
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname === '/patient/queue') {
    const patientToken = request.cookies.get('patient_token')?.value
    if (!patientToken) {
      return NextResponse.redirect(new URL('/patient/login', request.url))
    }
    try {
      jwt.verify(patientToken, process.env.JWT_SECRET!)
      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL('/patient/login', request.url))
    }
  }

  // Hanya proses untuk rute admin yang perlu dilindungi
  if (!matchesAdminRoute(pathname)) {
    return NextResponse.next()
  }

  // Ambil token dari cookie (nama cookie 'token')
  const token = request.cookies.get('token')?.value

  if (!token) {
    // Jika tidak ada token, redirect ke landing page (untuk halaman) atau return 401 untuk API
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: No token provided' },
        { status: 401 }
      )
    } else {
      // Redirect ke landing page untuk halaman admin
      const landingUrl = new URL('/', request.url)
      return NextResponse.redirect(landingUrl)
    }
  }

  // Verifikasi token
  const payload = verifyAdminToken(token)
  if (!payload) {
    // Token tidak valid atau expired
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or expired token' },
        { status: 401 }
      )
    } else {
      const landingUrl = new URL('/', request.url)
      return NextResponse.redirect(landingUrl)
    }
  }

  // Token valid, lanjutkan request
  // Optional: tambahkan payload ke header untuk digunakan di API routes
  const response = NextResponse.next()
  response.headers.set('X-Admin-Username', payload.username)
  return response
}

// Konfigurasi matcher (opsional, bisa juga pakai conditional di dalam fungsi)
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/backup/:path*',
    '/api/queue/call',
    '/api/queue/:id/complete',
    '/api/patient/:id/emr',
    '/api/finance/:path*',
    '/api/audit-log',
    '/patient/queue',
  ],
}
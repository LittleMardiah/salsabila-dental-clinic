// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenEdge } from '@/lib/auth' 

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
  if (pathname === '/admin/login' || pathname === '/admin/login/credentials') {
    return false
  }
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

  // Hanya proses untuk rute admin yang perlu dilindungi
  if (!matchesAdminRoute(pathname)) {
    return NextResponse.next()
  }

  // Ambil token dari cookie
  const token = request.cookies.get('token')?.value
  console.log(`[Middleware] Path: ${pathname}, Token exists: ${!!token}`)

  if (!token) {
    console.log('[Middleware] No token, redirecting to /')
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: No token provided' },
        { status: 401 }
      )
    } else {
      const landingUrl = new URL('/', request.url)
      return NextResponse.redirect(landingUrl)
    }
  }

  const payload = await verifyTokenEdge(token)
  if (!payload) {
    console.log('[Middleware] Invalid token')
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

  console.log(`[Middleware] Token valid for ${payload.username}`)
  const response = NextResponse.next()
  response.headers.set('X-Admin-Username', payload.username)
  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/backup/:path*',
    '/api/queue/call',
    '/api/queue/:id/complete',
    '/api/patient/:id/emr',
    '/api/finance/:path*',
    '/api/audit-log',
  ],
}
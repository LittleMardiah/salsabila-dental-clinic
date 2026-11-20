// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenEdge } from '@/lib/auth' 

const adminApiPatterns = [
  /^\/api\/backup(?:\/|$)/,
  /^\/api\/queue\/call$/,
  /^\/api\/queue\/[^/]+\/complete$/,
  /^\/api\/patient\/[^/]+\/emr$/,
  /^\/api\/finance(?:\/|$)/,
  /^\/api\/audit-log(?:\/|$)/,
]

function matchesAdminRoute(pathname: string): boolean {
  if (pathname === '/admin/login' || pathname === '/admin/login/credentials') {
    return false
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return true
  }
  return adminApiPatterns.some((pattern) => pattern.test(pathname))
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Hanya proses untuk rute admin yang perlu dilindungi
  if (!matchesAdminRoute(pathname)) {
    return NextResponse.next()
  }

  // Ambil token dari cookie. Hanya token admin dengan authLevel 2 (lolos
  // Layer 1 dan Layer 2) yang diterima.
  const token = request.cookies.get('token')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: No token provided' },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const payload = await verifyTokenEdge(token)
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or expired token' },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

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
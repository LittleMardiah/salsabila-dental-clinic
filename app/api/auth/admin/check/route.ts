import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/ServerAuth'

export async function GET(request: Request) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
  }
  return NextResponse.json({ username: auth.username, role: 'admin' })
}
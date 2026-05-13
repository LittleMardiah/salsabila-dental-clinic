import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPatientToken } from '@/lib/middleware/auth'

export async function POST(request: Request) {
  // Verifikasi patient token
  const authResult = await verifyPatientToken(request)
  if (!authResult.valid) {
    return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status || 401 })
  }
  const queueId = authResult.queueId
  if (!queueId) {
    return NextResponse.json({ success: false, error: 'Invalid token data' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }
  const { subscription } = body
  if (!subscription || !subscription.endpoint) {
    return NextResponse.json({ success: false, error: 'Invalid subscription' }, { status: 400 })
  }

  await prisma.webPushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      queueId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    create: {
      queueId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  })

  return NextResponse.json({ success: true })
}
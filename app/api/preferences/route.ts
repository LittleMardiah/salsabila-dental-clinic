import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'
import { z } from 'zod'

const preferenceSchema = z.object({
  hiddenMenus: z.array(z.string()),
})

export async function GET(request: Request) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const adminId = auth.username!

  let pref = await prisma.adminPreference.findUnique({
    where: { adminId },
  })

  if (!pref) {
    pref = await prisma.adminPreference.create({
      data: {
        adminId,
        hiddenMenus: [],
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      },
    })
  }

  return NextResponse.json({
    success: true,
    hiddenMenus: pref.hiddenMenus,
  })
}

export async function POST(request: Request) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
  const parsed = preferenceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { hiddenMenus } = parsed.data
  const adminId = auth.username!

  const pref = await prisma.adminPreference.upsert({
    where: { adminId },
    update: { hiddenMenus },
    create: {
      adminId,
      hiddenMenus,
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
    },
  })

  return NextResponse.json({
    success: true,
    hiddenMenus: pref.hiddenMenus,
  })
}
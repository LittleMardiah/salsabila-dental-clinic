export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePatientSession } from '@/lib/portal-auth'

/** Lightweight session probe used by the splash screen. */
export async function GET(request: Request) {
  const auth = await requirePatientSession(request)
  if (!auth.valid) {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 })
  }

  const account = await prisma.patientAccount.findUnique({
    where: { id: auth.session.accountId },
    select: {
      email: true,
      patient: {
        select: {
          id: true,
          noRm: true,
          name: true,
          phone: true,
          email: true,
          dateOfBirth: true,
          allergies: true,
          createdAt: true,
        },
      },
    },
  })

  if (!account) {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    email: account.email,
    patient: account.patient,
  })
}

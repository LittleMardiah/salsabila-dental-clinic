export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePatientSession } from '@/lib/portal-auth'
import { getPortalHome } from '@/lib/patient-portal'

/** Home tab: clinic status, live queue, next control, last visit — one round trip. */
export async function GET(request: Request) {
  const auth = await requirePatientSession(request)
  if (!auth.valid) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const patient = await prisma.patient.findUnique({
    where: { id: auth.session.patientId },
    select: { id: true },
  })
  if (!patient) {
    return NextResponse.json({ success: false, error: 'Data pasien tidak ditemukan' }, { status: 404 })
  }

  const data = await getPortalHome(auth.session.patientId)
  return NextResponse.json(
    { success: true, data },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requirePatientSession } from '@/lib/portal-auth'
import { getNextControl, getPatientVisits } from '@/lib/patient-portal'

/** Read-only EMR for the signed-in patient only. Never accepts a patient id. */
export async function GET(request: Request) {
  const auth = await requirePatientSession(request)
  if (!auth.valid) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const [visits, nextControl] = await Promise.all([
    getPatientVisits(auth.session.patientId),
    getNextControl(auth.session.patientId),
  ])

  return NextResponse.json(
    {
      success: true,
      data: {
        visits,
        nextControl,
        totalVisits: visits.length,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

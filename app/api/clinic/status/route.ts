export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { readClinicStatus, writeClinicStatus } from '@/lib/clinic-status'
import { verifyAdminToken } from '@/lib/middleware/auth'
import { addAuditLog } from '@/lib/services/audit.service'

const statusSchema = z.object({
  isOpen: z.boolean(),
})

/** Public read: the landing page polls this via /api/queue/public. */
export async function GET() {
  const status = await readClinicStatus()
  return NextResponse.json({ success: true, ...status })
}

/** Admin-only write: persists the real Buka / Tutup state. */
export async function POST(request: Request) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'JSON tidak valid' }, { status: 400 })
  }

  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Status klinik tidak valid' },
      { status: 400 }
    )
  }

  try {
    const status = await writeClinicStatus(parsed.data.isOpen, auth.username || 'unknown')
    await addAuditLog(
      auth.username || 'unknown',
      'UPDATE_CLINIC_STATUS',
      'ClinicStatus',
      '1',
      { isOpen: parsed.data.isOpen }
    )
    return NextResponse.json({
      success: true,
      isOpen: status.isOpen,
      updatedAt: status.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error(
      '[POST /api/clinic/status] gagal menyimpan status:',
      error instanceof Error ? error.message : 'unknown error'
    )
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal menyimpan status klinik. Pastikan migrasi ClinicStatus sudah diterapkan.',
      },
      { status: 500 }
    )
  }
}

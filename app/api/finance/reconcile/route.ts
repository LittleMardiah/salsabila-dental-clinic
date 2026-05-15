import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'
import { addAuditLog } from '@/lib/services/audit.service'

const reconcileSchema = z.object({
  date: z.string().date(),
  totalRecorded: z.number().positive(),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
  const parsed = reconcileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { date, totalRecorded, notes } = parsed.data
  const reconcileDate = new Date(date)

  // Cek apakah sudah ada reconciliasi untuk tanggal tersebut
  const existing = await prisma.dailyReconciliation.findUnique({
    where: { date: reconcileDate },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Reconciliation already exists for this date' },
      { status: 409 }
    )
  }

  const reconciliation = await prisma.dailyReconciliation.create({
    data: {
      date: reconcileDate,
      totalRecorded,
      notes,
      adminId: auth.username!,
    },
  })

    await addAuditLog(
    auth.username!,
    'RECONCILE',
    'daily_reconciliation',
    reconciliation.id.toString(),
    { date, totalRecorded, notes },
    request.headers.get('x-forwarded-for') || 'unknown'
  )

  return NextResponse.json({
    success: true,
    message: 'Reconciliation saved',
    data: reconciliation,
  })
}
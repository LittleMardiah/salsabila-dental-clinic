import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'

const actionTranslations: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  CREATE_QUEUE: 'Menambah Antrian',
  CALL_QUEUE: 'Memanggil Antrian',
  COMPLETE_QUEUE: 'Menyelesaikan Antrian',
  CREATE_EMR: 'Membuat Rekam Medis',
  UPDATE_EMR: 'Mengupdate Rekam Medis',
  DELETE_EMR: 'Menghapus Rekam Medis',
  CONFIRM_TRANSACTION: 'Konfirmasi Pembayaran',
  RECONCILE: 'Rekonsiliasi Harian',
  BACKUP_LOCAL: 'Backup Lokal',
  BACKUP_CLOUD: 'Backup Cloud',
  UPDATE_PREFERENCES: 'Update Preferensi',
}

export async function GET(request: Request) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const url = new URL(request.url)
  const mode = url.searchParams.get('mode') || 'admin'
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const action = url.searchParams.get('action')
  const adminId = url.searchParams.get('adminId')
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const page = parseInt(url.searchParams.get('page') || '1')

  const where: any = {}
  if (from) where.createdAt = { gte: new Date(from) }
  if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) }
  if (action) where.actionType = action
  if (adminId) where.adminId = adminId

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })
  const total = await prisma.auditLog.count({ where })

  if (mode === 'admin') {
    // Transform ke Bahasa Indonesia
    const transformed = logs.map(log => ({
      id: log.id,
      timestamp: log.createdAt,
      admin: log.adminId,
      action: actionTranslations[log.actionType] || log.actionType,
      detail: `${log.recordType} ID ${log.recordId}`,
      status: 'Sukses',
    }))
    return NextResponse.json({
      success: true,
      mode: 'admin',
      logs: transformed,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } else {
    // Raw JSON for developer
    return NextResponse.json({
      success: true,
      mode: 'developer',
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  }
}
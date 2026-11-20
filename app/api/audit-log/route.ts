export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server' 
import { prisma } from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/middleware/auth'
import { addAuditLog } from '@/lib/services/audit.service'
import { clinicDayRangeFromInput } from '@/lib/clinic-date'

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
  SWITCH_OPERATOR: 'Ganti Operator',
}

/**
 * @openapi
 * /api/audit-log:
 *   get:
 *     summary: Mendapatkan log audit
 *     description: Mengembalikan riwayat aktivitas admin dalam dua mode (admin-friendly atau developer raw).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [admin, developer]
 *         description: Mode tampilan (admin = Bahasa Indonesia, developer = raw JSON)
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter tanggal mulai (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter tanggal akhir (YYYY-MM-DD)
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter berdasarkan tipe aksi
 *       - in: query
 *         name: adminId
 *         schema:
 *           type: string
 *         description: Filter berdasarkan username admin
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Jumlah data per halaman
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Nomor halaman
 *     responses:
 *       200:
 *         description: Sukses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 mode:
 *                   type: string
 *                 logs:
 *                   type: array
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
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
  if (from) {
    where.createdAt = { gte: clinicDayRangeFromInput(from).start }
  }
  if (to) {
    where.createdAt = { ...where.createdAt, lt: clinicDayRangeFromInput(to).end }
  }
  if (action) where.actionType = action
  if (adminId) where.adminId = adminId

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  if (mode === 'admin') {
    const describe = (log: any) => {
      const d = (log.technicalDetails || {}) as Record<string, any>
      switch (log.actionType) {
        case 'CREATE_QUEUE':
          return `Menerbitkan ${d.queueNumber ? `A-${String(d.queueNumber).padStart(2, '0')}` : 'antrean'} (${d.patientName || '-'}) • ${d.mode || 'MANUAL'}${d.patientCode ? ` • Token ${d.patientCode}` : ''}`
        case 'CALL_QUEUE':
          return `Memanggil ${d.queueNumber ? `A-${String(d.queueNumber).padStart(2, '0')}` : 'antrean'} (${d.patientName || '-'})`
        case 'COMPLETE_QUEUE':
          return `Menyelesaikan antrean ${log.recordId}`
        case 'CREATE_EMR':
        case 'UPDATE_EMR':
          return `${log.actionType === 'CREATE_EMR' ? 'Menyimpan' : 'Memperbarui'} rekam medis ${log.recordType} #${log.recordId}`
        case 'CONFIRM_TRANSACTION':
          return `Mengonfirmasi pembayaran ${d.amount ? `Rp ${Number(d.amount).toLocaleString('id-ID')}` : ''} (${d.paymentMethod || '-'})`
        case 'RECONCILE':
          return `Rekonsiliasi kas ${d.date || ''} • Rp ${Number(d.totalRecorded || 0).toLocaleString('id-ID')}`
        case 'SWITCH_OPERATOR':
          return `Operator aktif diganti ke ${d.operator || '-'}`
        case 'LOGIN':
        case 'LOGOUT':
          return `${log.actionType === 'LOGIN' ? 'Masuk' : 'Keluar'} dari dashboard klinik`
        default:
          return `${log.recordType} ID ${log.recordId}`
      }
    }

    const transformed = logs.map((log: any) => ({
      id: log.id,
      timestamp: log.createdAt,
      admin: log.adminId,
      action: actionTranslations[log.actionType] || log.actionType,
      actionType: log.actionType,
      detail: describe(log),
      status: 'Sukses',
    }))
    return NextResponse.json({
      success: true,
      mode: 'admin',
      logs: transformed,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } else {
    return NextResponse.json({
      success: true,
      mode: 'developer',
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  }
}
/**
 * Records an operator switch in the real audit trail.
 * Body: { operator: 'Drg. Salsabila' | 'Admin Resepsionis' }
 */
export async function POST(request: Request) {
  const auth = await verifyAdminToken(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
  }

  let body: { operator?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const operator = (body.operator || '').trim()
  if (!operator) {
    return NextResponse.json({ error: 'Operator wajib diisi' }, { status: 400 })
  }

  await addAuditLog(
    auth.username || 'unknown',
    'SWITCH_OPERATOR',
    'admin',
    auth.username || 'unknown',
    { operator },
    request.headers.get('x-forwarded-for') || 'unknown'
  )

  return NextResponse.json({ success: true })
}

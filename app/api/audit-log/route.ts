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
    const fromDate = new Date(from)
    fromDate.setHours(0, 0, 0, 0)
    where.createdAt = { gte: fromDate }
  }
  if (to) {
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    where.createdAt = { ...where.createdAt, lte: toDate }
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
    return NextResponse.json({
      success: true,
      mode: 'developer',
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  }
}
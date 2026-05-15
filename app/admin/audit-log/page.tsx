'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

export default function AuditLogPage() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [adminFilter, setAdminFilter] = useState('')
  const [page, setPage] = useState(1)
  const limit = 10

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['auditLog', fromDate, toDate, actionFilter, adminFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      if (actionFilter) params.set('action', actionFilter)
      if (adminFilter) params.set('adminId', adminFilter)
      params.set('page', page.toString())
      params.set('limit', limit.toString())
      const res = await fetch(`/api/audit-log?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch audit log')
      return res.json()
    },
  })

  const handleApplyFilter = () => {
    setPage(1)
    refetch()
  }

  const handleReset = () => {
    setFromDate('')
    setToDate('')
    setActionFilter('')
    setAdminFilter('')
    setPage(1)
    setTimeout(() => refetch(), 0)
  }

  if (error) toast.error('Gagal memuat data audit log')

  const logs = data?.logs || []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages || 1

  const actionOptions = [
    { value: '', label: 'Semua Aksi' },
    { value: 'CREATE', label: 'Create Record' },
    { value: 'UPDATE', label: 'Update Record' },
    { value: 'DELETE', label: 'Delete Record' },
    { value: 'LOGIN', label: 'Login' },
    { value: 'LOGOUT', label: 'Logout' },
    { value: 'RECONCILE', label: 'Reconciliation' },
    { value: 'BACKUP', label: 'Backup System' },
  ]

  const getStatusBadge = (action: string) => {
    const upperAction = (action || '').toUpperCase()
    if (upperAction === 'DELETE') {
      return {
        label: 'Denied',
        class: 'bg-error/10 text-error ring-error/20',
        dotClass: 'bg-error'
      }
    }
    if (upperAction === 'BACKUP') {
      return {
        label: 'Finished',
        class: 'bg-secondary/10 text-secondary ring-secondary/20',
        dotClass: 'bg-secondary'
      }
    }
    if (upperAction === 'LOGIN' || upperAction === 'LOGOUT') {
      return {
        label: 'Authorized',
        class: 'bg-secondary/10 text-secondary ring-secondary/20',
        dotClass: 'bg-secondary'
      }
    }
    return {
      label: 'Success',
      class: 'bg-secondary/10 text-secondary ring-secondary/20',
      dotClass: 'bg-secondary'
    }
  }

  const formatDetail = (log: any) => {
    if (log.detail) return log.detail
    if (log.description) return log.description
    if (log.technicalDetails) {
      try {
        const details = typeof log.technicalDetails === 'string' 
          ? JSON.parse(log.technicalDetails) 
          : log.technicalDetails
        if (typeof details === 'string') return details
        return `${log.action || log.actionType} pada ${log.recordType || 'record'} ID ${log.recordId || '-'}`
      } catch {
        return log.technicalDetails
      }
    }
    if (log.recordType && log.recordId) {
      return `${log.action || log.actionType} ${log.recordType} ID ${log.recordId}`
    }
    return `${log.action || log.actionType || '-'} ${log.recordType || ''}`
  }

  const getLogDate = (log: any) => {
    return new Date(log.timestamp || log.createdAt || log.waktu)
  }

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen">
      <main className="p-8 lg:p-12">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-headline font-bold text-primary tracking-tight">Audit Log</h2>
            <p className="text-on-surface-variant mt-2 font-medium opacity-70">
              Pantau & Lacak segala aktivitas di Salsa Dental Clinic.
            </p>
          </div>
        </header>

        {/* Filter Section */}
        <section className="glass-card perspective-card rounded-[2rem] p-8 mb-12 border border-white/40 overflow-hidden relative">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="font-label text-xs font-bold text-primary uppercase tracking-widest ml-1">Dari Tanggal</label>
              <div className="relative group">
                <input
                title='.'
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full h-14 bg-surface-container-low/50 border-none rounded-2xl px-5 font-body focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-label text-xs font-bold text-primary uppercase tracking-widest ml-1">Sampai Tanggal</label>
              <div className="relative group">
                <input
                title='.'
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full h-14 bg-surface-container-low/50 border-none rounded-2xl px-5 font-body focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-label text-xs font-bold text-primary uppercase tracking-widest ml-1">Filter Aksi</label>
              <div className="relative group">
                <select
                title='.'
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full h-14 bg-surface-container-low/50 border-none rounded-2xl px-5 font-body focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none appearance-none"
                >
                  {actionOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary/40 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-label text-xs font-bold text-primary uppercase tracking-widest ml-1">Filter Admin</label>
              <div className="relative group">
                <input
                  type="text"
                  value={adminFilter}
                  onChange={(e) => setAdminFilter(e.target.value)}
                  placeholder="Cari nama admin..."
                  className="w-full h-14 bg-surface-container-low/50 border-none rounded-2xl px-5 font-body focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none"
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary/40 pointer-events-none">
                  person_search
                </span>
              </div>
            </div>

            <div className="md:col-span-4 flex justify-end gap-4 pt-4">
              <button
                onClick={handleReset}
                className="px-8 py-3 rounded-full border-2 border-outline-variant/30 text-primary font-bold hover:bg-surface-container-high transition-all text-sm"
              >
                Reset
              </button>
              <button
                onClick={handleApplyFilter}
                className="px-10 py-3 rounded-full text-white font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #DCA1A1 0%, #663a3b 100%)' }}
              >
                <span className="material-symbols-outlined text-lg">filter_alt</span>
                Terapkan Filter
              </button>
            </div>
          </div>
        </section>

        {/* Tabel Data */}
        <div className="bg-surface-container-lowest rounded-[2rem] shadow-ambient overflow-hidden border border-white/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/40">
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest">Waktu</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest">Admin</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest">Aksi</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest">Detail</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant">Memuat data...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant">Tidak ada log ditemukan</td>
                  </tr>
                ) : (
                  logs.map((log: any) => {
                    const action = log.action || log.actionType || '-'
                    const adminName = log.adminId || log.admin || log.username || '-'
                    const detail = formatDetail(log)
                    const status = getStatusBadge(action)
                    const logDate = getLogDate(log)
                    const isValidDate = !isNaN(logDate.getTime())
                    return (
                      <tr key={log.id} className="hover:bg-surface-container-low/30 transition-colors group">
                        <td className="px-8 py-6 text-sm font-body text-on-surface-variant">
                          {isValidDate ? (
                            <>
                              <span className="font-bold">{format(logDate, 'dd/MM/yyyy')}</span><br />
                              <span className="text-xs opacity-60">{format(logDate, 'HH:mm:ss')}</span>
                            </>
                          ) : (
                            <span className="text-xs opacity-60">-</span>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined text-xl">account_circle</span>
                            </div>
                            <span className="font-label font-bold text-sm">{adminName}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="px-3 py-1 rounded-full bg-surface-container-high text-primary font-bold text-xs">
                            {action}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm text-on-surface-variant max-w-xs truncate">{detail}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs shadow-sm ring-1 ${status.class}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`}></span>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && totalPages > 1 && (
            <div className="px-8 py-6 bg-surface-container-low/20 flex items-center justify-between border-t border-outline-variant/10 flex-wrap gap-4">
              <p className="text-sm text-on-surface-variant font-medium">
                Menampilkan <span className="font-bold text-primary">{(page-1)*limit + 1}</span> -{' '}
                <span className="font-bold text-primary">{Math.min(page*limit, pagination.total)}</span> dari{' '}
                <span className="font-bold text-primary">{pagination.total}</span> entri
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setPage(p => Math.max(1, p-1))}
                  disabled={page === 1}
                  className="w-10 h-10 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-sm hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = page
                  if (totalPages <= 5) pageNum = i+1
                  else if (page <= 3) pageNum = i+1
                  else if (page >= totalPages-2) pageNum = totalPages - 4 + i
                  else pageNum = page - 2 + i
                  if (pageNum < 1 || pageNum > totalPages) return null
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                        pageNum === page
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-surface-container-lowest text-primary shadow-sm hover:bg-primary-container'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                {totalPages > 5 && page < totalPages-2 && (
                  <span className="px-2 text-primary/40">...</span>
                )}
                {totalPages > 5 && page < totalPages-2 && (
                  <button
                    onClick={() => setPage(totalPages)}
                    className="w-10 h-10 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-sm hover:bg-primary-container transition-all font-bold text-sm"
                  >
                    {totalPages}
                  </button>
                )}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p+1))}
                  disabled={page === totalPages}
                  className="w-10 h-10 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-sm hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-12 text-center">
          <p className="text-xs font-label text-on-surface-variant opacity-50">
            © 2025 Salsa Dental Portal. Secured with AES-256 Clinical Grade Encryption.
          </p>
        </footer>
      </main>
    </div>
  )
}
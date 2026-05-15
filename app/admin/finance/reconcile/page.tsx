'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { toast } from 'sonner'

type Transaction = {
  id: number
  amount: number
  paymentMethod: string
}

type ReconciliationLog = {
  id: number
  date: string
  totalRecorded: number
  notes?: string
  adminId: string
  reconciledAt: string
}

export default function ReconcilePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [totalRecorded, setTotalRecorded] = useState('')
  const [notes, setNotes] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Query data konfirmasi transaksi
  const { data: confirmedData, isLoading: isLoadingConfirmed } = useQuery({
    queryKey: ['transactions', 'confirmed', date],
    queryFn: async () => {
      const res = await fetch(`/api/finance/transactions?status=CONFIRMED&date=${date}`)
      if (!res.ok) throw new Error('Failed to fetch confirmed transactions')
      return res.json()
    },
  })

  // Query riwayat rekonsiliasi
  const { data: historyData, isLoading: isLoadingHistory, error: historyError, refetch: refetchHistory } = useQuery({
    queryKey: ['reconciliations', 'history'],
    queryFn: async () => {
      const res = await fetch('/api/finance/reconcile?limit=100')
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error || 'Failed to fetch reconciliation history')
      }
      return res.json()
    },
  })

  const transactions: Transaction[] = confirmedData?.data || []
  const totalConfirmed = transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
  const totalCash = transactions
    .filter(t => t.paymentMethod?.toUpperCase() === 'CASH')
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const totalDigital = transactions
    .filter(t => t.paymentMethod?.toUpperCase() !== 'CASH')
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const reconciliationLogs: ReconciliationLog[] = historyData?.data || []

  const totalPages = Math.ceil(reconciliationLogs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLogs = reconciliationLogs.slice(startIndex, endIndex)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const amountNum = parseFloat(totalRecorded)
      if (isNaN(amountNum) || amountNum <= 0) throw new Error('Total pemasukan harus lebih dari 0')
      const res = await fetch('/api/finance/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, totalRecorded: amountNum, notes }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal rekonsiliasi')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Rekonsiliasi harian disimpan')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] })
      setTotalRecorded('')
      setNotes('')
      setCurrentPage(1)
      refetchHistory()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    reconcileMutation.mutate()
  }

  return (
    // PERBAIKAN: Hapus atmospheric-glow, pakai bg-surface solid
    <div className="bg-surface min-h-screen text-on-surface antialiased">
      {/* PERBAIKAN: Hapus seluruh breadcrumb sticky */}
      
      <main className="w-full">
        <div className="px-6 md:px-8 py-6 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column - Form */}
            <div className="lg:col-span-2">
              <div className="glass-card rounded-2xl md:rounded-3xl p-8 md:p-10 relative overflow-hidden">
                <header className="mb-8 md:mb-10 relative z-10">
                  <span className="text-primary text-xs font-bold tracking-[0.25em] uppercase mb-2 block">Financial Audit</span>
                  <h1 className="font-display font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight leading-tight">
                    Rekonsiliasi Harian
                  </h1>
                  <p className="text-on-surface-variant mt-2 md:mt-3 text-base md:text-lg">
                    Penyesuaian antara Pendapatan Fisik dengan Sistem.
                  </p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-on-surface/80 ml-4">Tanggal Rekonsiliasi</label>
                      <div className="relative group">
                        <input
                          title="Select date"
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full bg-surface-container-low/50 border border-outline-variant/20 rounded-2xl md:rounded-3xl px-5 md:px-6 py-3 md:py-4 text-on-surface focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 group-hover:bg-surface-container-low transition-all"
                        />
                        <span className="material-symbols-outlined absolute right-5 md:right-6 top-1/2 -translate-y-1/2 text-primary pointer-events-none text-xl">
                          calendar_today
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-on-surface/80 ml-4">Laporan Pendapatan</label>
                      <div className="relative group">
                        <input
                          type="number"
                          value={totalRecorded}
                          onChange={(e) => setTotalRecorded(e.target.value)}
                          placeholder="Contoh: 2500000"
                          className="w-full bg-surface-container-low/50 border border-outline-variant/20 rounded-2xl md:rounded-3xl px-5 md:px-6 py-3 md:py-4 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 group-hover:bg-surface-container-low transition-all"
                          required
                        />
                        <span className="material-symbols-outlined absolute right-5 md:right-6 top-1/2 -translate-y-1/2 text-primary pointer-events-none text-xl">
                          payments
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface/80 ml-4">(Catatan)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Masukan catatan rekonsiliasi hari ini..."
                      rows={4}
                      className="w-full bg-surface-container-low/50 border border-outline-variant/20 rounded-2xl md:rounded-3xl px-5 md:px-6 py-3 md:py-4 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 group-hover:bg-surface-container-low transition-all resize-none"
                    />
                  </div>

                  <div className="pt-4 md:pt-6 border-t border-outline-variant/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6">
                    <div className="flex items-start sm:items-center gap-3 text-on-surface-variant/80 flex-1">
                      <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-full flex-shrink-0 mt-0.5 sm:mt-0">
                        info
                      </span>
                      <p className="text-xs leading-relaxed">
                        Pastikan menghitung secara benar uang yang diterima sebelum menekan Tombol 'Simpan Rekonsiliasi'.
                      </p>
                    </div>
                    {/* PERBAIKAN: Tombol tanpa gradasi, solid bg-primary */}
                    <button
                      type="submit"
                      disabled={reconcileMutation.isPending || !totalRecorded}
                      className="bg-primary text-white font-display font-bold py-4 md:py-5 px-6 md:px-10 rounded-full flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all duration-300 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      {reconcileMutation.isPending ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          Simpan Rekonsiliasi
                          <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform text-xl">
                            arrow_forward
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column - Reference Cards */}
            <div className="lg:col-span-1 space-y-4 md:space-y-6">
              {/* Reference Balance Card - tanpa gradasi */}
              <div className="bg-primary-container/20 backdrop-blur-2xl rounded-2xl md:rounded-3xl p-6 md:p-8 border border-white/30 shadow-xl">
                <div className="relative z-10">
                  <h3 className="text-xs font-bold text-on-primary-container tracking-widest uppercase mb-4">REKONSILIASI</h3>
                  <p className="text-on-primary-container/70 font-display font-medium text-sm">Total Uang yang Diterima Sistem</p>
                  <span className="text-primary font-display font-extrabold text-2xl md:text-3xl tracking-tighter block mt-2">
                    {isLoadingConfirmed ? 'Loading...' : formatCurrency(totalConfirmed)}
                  </span>
                  <p className="text-on-primary-container/60 text-xs leading-relaxed mt-4">
                    Perhitungan ini sudah meliputi pembayaran melalui CASH / TRANSFER.
                  </p>
                </div>
              </div>

              {/* Cash & Digital Cards */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="glass-card rounded-2xl md:rounded-[28px] p-4 md:p-6">
                  <span className="material-symbols-outlined text-secondary mb-3 text-2xl">check_circle</span>
                  <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Cash</p>
                  <p className="font-display font-bold text-xs md:text-sm text-on-surface">
                    {isLoadingConfirmed ? '...' : formatCurrency(totalCash)}
                  </p>
                </div>
                <div className="glass-card rounded-2xl md:rounded-[28px] p-4 md:p-6">
                  <span className="material-symbols-outlined text-primary mb-3 text-2xl">credit_card</span>
                  <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Digital / Transfer</p>
                  <p className="font-display font-bold text-xs md:text-sm text-on-surface">
                    {isLoadingConfirmed ? '...' : formatCurrency(totalDigital)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Logs Section */}
          <section>
            <h2 className="font-display font-bold text-2xl md:text-3xl text-on-surface mb-6 flex items-center gap-3">
              <span className="w-8 h-[2px] bg-primary-fixed"></span>
              Riwayat Rekonsiliasi
            </h2>

            <div className="bg-surface-container-low/40 backdrop-blur-sm rounded-2xl md:rounded-3xl overflow-hidden border border-outline-variant/20 shadow-lg">
              {isLoadingHistory ? (
                <div className="p-8 md:p-12 text-center text-on-surface-variant">
                  <div className="flex justify-center mb-3">
                    <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  </div>
                  Loading history...
                </div>
              ) : historyError ? (
                <div className="p-8 md:p-12 text-center">
                  <span className="material-symbols-outlined text-error text-4xl mb-3 block">error</span>
                  <p className="text-error font-medium">Error loading history</p>
                </div>
              ) : reconciliationLogs.length === 0 ? (
                <div className="p-8 md:p-12 text-center">
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl mb-3 block">history</span>
                  <p className="text-on-surface-variant font-medium">No reconciliation records found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm md:text-base">
                      <thead>
                        <tr className="bg-surface-container-high/40 border-b border-outline-variant/10">
                          <th className="px-4 md:px-8 py-4 md:py-5 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Tanggal</th>
                          <th className="px-4 md:px-8 py-4 md:py-5 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Jumlah Rekonsiliasi</th>
                          <th className="px-4 md:px-8 py-4 md:py-5 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Editor</th>
                          <th className="px-4 md:px-8 py-4 md:py-5 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {paginatedLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/30 transition-colors">
                            <td className="px-4 md:px-8 py-4 md:py-6 text-sm font-medium text-on-surface">
                              {format(new Date(log.date), 'dd MMM yyyy', { locale: localeId })}
                            </td>
                            <td className="px-4 md:px-8 py-4 md:py-6 text-sm font-bold text-on-surface">
                              {formatCurrency(log.totalRecorded)}
                            </td>
                            <td className="px-4 md:px-8 py-4 md:py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-[10px] font-bold text-primary shadow-md">
                                  {log.adminId?.charAt(0)?.toUpperCase() || 'A'}
                                </div>
                                <span className="text-sm text-on-surface font-medium">{log.adminId}</span>
                              </div>
                            </td>
                            <td className="px-4 md:px-8 py-4 md:py-6">
                              <span className="px-3 py-1.5 bg-secondary/20 text-secondary text-[10px] font-bold rounded-full uppercase tracking-tighter border border-secondary/30">
                                Sukses
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6 border-t border-outline-variant/10 bg-surface-container-high/20">
                      <p className="text-sm text-on-surface-variant">
                        Showing {startIndex + 1} to {Math.min(endIndex, reconciliationLogs.length)} of {reconciliationLogs.length} entries
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 rounded-lg bg-surface-container-low/50 border border-outline-variant/20 text-on-surface hover:bg-surface-container-low disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-xl">chevron_left</span>
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                              currentPage === page
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-surface-container-low/50 border border-outline-variant/20 text-on-surface hover:bg-surface-container-low'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 rounded-lg bg-surface-container-low/50 border border-outline-variant/20 text-on-surface hover:bg-surface-container-low disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-xl">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
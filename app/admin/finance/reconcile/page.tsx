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
    <div className="bg-surface min-h-screen text-on-surface antialiased">
      <main className="w-full">
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            {/* Left Column - Form */}
            <div className="lg:col-span-2">
              <div className="glass-card rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-10 relative overflow-hidden">
                <header className="mb-4 sm:mb-6 md:mb-8 lg:mb-10 relative z-10">
                  <span className="text-primary text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase mb-1 sm:mb-2 block">Financial Audit</span>
                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl text-on-surface tracking-tight leading-tight">
                    Rekonsiliasi Harian
                  </h1>
                  <p className="text-on-surface-variant mt-1 sm:mt-2 md:mt-3 text-sm sm:text-base md:text-lg">
                    Penyesuaian antara Pendapatan Fisik dengan Sistem.
                  </p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 md:space-y-8 relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-on-surface/80 ml-3 sm:ml-4">Tanggal Rekonsiliasi</label>
                      <div className="relative group">
                        <input
                          title="Select date"
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full bg-surface-container-low/50 border border-outline-variant/20 rounded-xl sm:rounded-2xl md:rounded-3xl px-3 sm:px-5 md:px-6 py-2 sm:py-3 md:py-4 text-on-surface text-sm sm:text-base focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 group-hover:bg-surface-container-low transition-all"
                        />
                        <span className="material-symbols-outlined absolute right-3 sm:right-5 md:right-6 top-1/2 -translate-y-1/2 text-primary pointer-events-none text-base sm:text-xl">
                          calendar_today
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-on-surface/80 ml-3 sm:ml-4">Laporan Pendapatan</label>
                      <div className="relative group">
                        <input
                          type="number"
                          value={totalRecorded}
                          onChange={(e) => setTotalRecorded(e.target.value)}
                          placeholder="Contoh: 2500000"
                          className="w-full bg-surface-container-low/50 border border-outline-variant/20 rounded-xl sm:rounded-2xl md:rounded-3xl px-3 sm:px-5 md:px-6 py-2 sm:py-3 md:py-4 text-on-surface text-sm sm:text-base placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 group-hover:bg-surface-container-low transition-all"
                          required
                        />
                        <span className="material-symbols-outlined absolute right-3 sm:right-5 md:right-6 top-1/2 -translate-y-1/2 text-primary pointer-events-none text-base sm:text-xl">
                          payments
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-on-surface/80 ml-3 sm:ml-4">(Catatan)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Masukan catatan rekonsiliasi hari ini..."
                      rows={3}
                      className="w-full bg-surface-container-low/50 border border-outline-variant/20 rounded-xl sm:rounded-2xl md:rounded-3xl px-3 sm:px-5 md:px-6 py-2 sm:py-3 md:py-4 text-on-surface text-sm sm:text-base placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 group-hover:bg-surface-container-low transition-all resize-none"
                    />
                  </div>

                  <div className="pt-3 sm:pt-4 md:pt-6 border-t border-outline-variant/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 md:gap-6">
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 text-on-surface-variant/80 flex-1">
                      <span className="material-symbols-outlined text-primary bg-primary/10 p-1.5 sm:p-2 rounded-full flex-shrink-0 mt-0.5 sm:mt-0 text-base sm:text-xl">
                        info
                      </span>
                      <p className="text-[11px] sm:text-xs leading-relaxed">
                        Pastikan menghitung secara benar uang yang diterima sebelum menekan Tombol 'Simpan Rekonsiliasi'.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={reconcileMutation.isPending || !totalRecorded}
                      className="bg-primary text-white font-display font-bold py-2.5 sm:py-4 md:py-5 px-4 sm:px-6 md:px-10 rounded-full flex items-center justify-center gap-2 sm:gap-3 shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all duration-300 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed group text-sm sm:text-base"
                    >
                      {reconcileMutation.isPending ? (
                        <>
                          <span className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          Simpan Rekonsiliasi
                          <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform text-base sm:text-xl">
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
            <div className="lg:col-span-1 space-y-3 sm:space-y-4 md:space-y-6">
              <div className="bg-primary-container/20 backdrop-blur-2xl rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 border border-white/30 shadow-xl">
                <div className="relative z-10">
                  <h3 className="text-[10px] sm:text-xs font-bold text-on-primary-container tracking-widest uppercase mb-2 sm:mb-4">REKONSILIASI</h3>
                  <p className="text-on-primary-container/70 font-display font-medium text-xs sm:text-sm">Total Uang yang Diterima Sistem</p>
                  <span className="text-primary font-display font-extrabold text-xl sm:text-2xl md:text-3xl tracking-tighter block mt-1 sm:mt-2">
                    {isLoadingConfirmed ? 'Loading...' : formatCurrency(totalConfirmed)}
                  </span>
                  <p className="text-on-primary-container/60 text-[11px] sm:text-xs leading-relaxed mt-2 sm:mt-4">
                    Perhitungan ini sudah meliputi pembayaran melalui CASH / TRANSFER.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <div className="glass-card rounded-xl sm:rounded-2xl md:rounded-[28px] p-3 sm:p-4 md:p-6">
                  <span className="material-symbols-outlined text-secondary mb-1 sm:mb-3 text-lg sm:text-2xl">check_circle</span>
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5 sm:mb-1">Cash</p>
                  <p className="font-display font-bold text-xs sm:text-sm md:text-base text-on-surface">
                    {isLoadingConfirmed ? '...' : formatCurrency(totalCash)}
                  </p>
                </div>
                <div className="glass-card rounded-xl sm:rounded-2xl md:rounded-[28px] p-3 sm:p-4 md:p-6">
                  <span className="material-symbols-outlined text-primary mb-1 sm:mb-3 text-lg sm:text-2xl">credit_card</span>
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5 sm:mb-1">Digital / Transfer</p>
                  <p className="font-display font-bold text-xs sm:text-sm md:text-base text-on-surface">
                    {isLoadingConfirmed ? '...' : formatCurrency(totalDigital)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Logs Section */}
          <section>
            <h2 className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-on-surface mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
              <span className="w-6 sm:w-8 h-[2px] bg-primary-fixed"></span>
              Riwayat Rekonsiliasi
            </h2>

            <div className="bg-surface-container-low/40 backdrop-blur-sm rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden border border-outline-variant/20 shadow-lg">
              {isLoadingHistory ? (
                <div className="p-6 sm:p-8 md:p-12 text-center text-on-surface-variant">
                  <div className="flex justify-center mb-2 sm:mb-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 sm:border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  </div>
                  Loading history...
                </div>
              ) : historyError ? (
                <div className="p-6 sm:p-8 md:p-12 text-center">
                  <span className="material-symbols-outlined text-error text-3xl sm:text-4xl mb-2 sm:mb-3 block">error</span>
                  <p className="text-error font-medium text-sm sm:text-base">Error loading history</p>
                </div>
              ) : reconciliationLogs.length === 0 ? (
                <div className="p-6 sm:p-8 md:p-12 text-center">
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-3xl sm:text-4xl mb-2 sm:mb-3 block">history</span>
                  <p className="text-on-surface-variant font-medium text-sm sm:text-base">No reconciliation records found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-[600px] sm:min-w-full w-full text-left border-collapse text-xs sm:text-sm md:text-base">
                      <thead>
                        <tr className="bg-surface-container-high/40 border-b border-outline-variant/10">
                          <th className="px-3 sm:px-4 md:px-8 py-3 sm:py-4 md:py-5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-on-surface-variant">Tanggal</th>
                          <th className="px-3 sm:px-4 md:px-8 py-3 sm:py-4 md:py-5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-on-surface-variant">Jumlah Rekonsiliasi</th>
                          <th className="px-3 sm:px-4 md:px-8 py-3 sm:py-4 md:py-5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-on-surface-variant">Editor</th>
                          <th className="px-3 sm:px-4 md:px-8 py-3 sm:py-4 md:py-5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {paginatedLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/30 transition-colors">
                            <td className="px-3 sm:px-4 md:px-8 py-3 sm:py-4 md:py-6 text-xs sm:text-sm font-medium text-on-surface">
                              {format(new Date(log.date), 'dd MMM yyyy', { locale: localeId })}
                            </td>
                            <td className="px-3 sm:px-4 md:px-8 py-3 sm:py-4 md:py-6 text-xs sm:text-sm font-bold text-on-surface">
                              {formatCurrency(log.totalRecorded)}
                            </td>
                            <td className="px-3 sm:px-4 md:px-8 py-3 sm:py-4 md:py-6">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary-fixed flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-primary shadow-md">
                                  {log.adminId?.charAt(0)?.toUpperCase() || 'A'}
                                </div>
                                <span className="text-xs sm:text-sm text-on-surface font-medium">{log.adminId}</span>
                              </div>
                             </td>
                            <td className="px-3 sm:px-4 md:px-8 py-3 sm:py-4 md:py-6">
                              <span className="px-2 sm:px-3 py-0.5 sm:py-1.5 bg-secondary/20 text-secondary text-[9px] sm:text-[10px] font-bold rounded-full uppercase tracking-tighter border border-secondary/30">
                                Sukses
                              </span>
                             </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 px-3 sm:px-4 md:px-8 py-3 sm:py-4 md:py-6 border-t border-outline-variant/10 bg-surface-container-high/20">
                      <p className="text-[11px] sm:text-sm text-on-surface-variant text-center sm:text-left">
                        Showing {startIndex + 1} to {Math.min(endIndex, reconciliationLogs.length)} of {reconciliationLogs.length} entries
                      </p>
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-surface-container-low/50 border border-outline-variant/20 text-on-surface hover:bg-surface-container-low disabled:opacity-50 text-xs sm:text-sm"
                        >
                          <span className="material-symbols-outlined text-base sm:text-xl">chevron_left</span>
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
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
                          className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-surface-container-low/50 border border-outline-variant/20 text-on-surface hover:bg-surface-container-low disabled:opacity-50 text-xs sm:text-sm"
                        >
                          <span className="material-symbols-outlined text-base sm:text-xl">chevron_right</span>
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
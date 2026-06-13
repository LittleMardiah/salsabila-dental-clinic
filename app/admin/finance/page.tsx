// app/admin/finance/page.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale' // alias untuk menghindari konflik
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Transaction {
  id: number
  queueId: number
  patientId: number
  amount: number | null
  paymentMethod: string | null
  status: 'PENDING' | 'CONFIRMED'
  receiptUrl: string | null
  createdAt: string
  confirmedAt: string | null
  patient: { name: string }
  queue: { queueNumber: number }
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed'>('pending')
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['transactions', 'pending', today],
    queryFn: async () => {
      const res = await fetch(`/api/finance/transactions?status=PENDING&date=${today}`)
      if (!res.ok) throw new Error('Failed to fetch pending transactions')
      return res.json()
    },
  })

  const { data: confirmedData, isLoading: confirmedLoading } = useQuery({
    queryKey: ['transactions', 'confirmed', today],
    queryFn: async () => {
      const res = await fetch(`/api/finance/transactions?status=CONFIRMED&date=${today}`)
      if (!res.ok) throw new Error('Failed to fetch confirmed transactions')
      return res.json()
    },
  })

  const pendingTransactions: Transaction[] = pendingData?.data || []
  const confirmedTransactions: Transaction[] = confirmedData?.data || []
  const totalRevenue = confirmedTransactions.reduce((sum: number, t: Transaction) => sum + (t.amount || 0), 0)
  const totalPending = pendingTransactions.reduce((sum: number, t: Transaction) => sum + (t.amount || 0), 0)

  const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`

  const exportToExcel = () => {
    const data: Transaction[] = activeTab === 'pending' ? pendingTransactions : confirmedTransactions
    const worksheetData = data.map((t: Transaction) => ({
      'No Antrian': t.queue.queueNumber,
      'Nama Pasien': t.patient.name,
      'Tanggal': format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm'),
      'Jumlah': t.amount ? formatCurrency(t.amount) : '-',
      'Metode': t.paymentMethod === 'CASH' ? 'Tunai' : (t.paymentMethod === 'TRANSFER' ? 'Transfer' : '-'),
      'Status': activeTab === 'pending' ? 'Pending' : 'Confirmed',
      'Tanggal Konfirmasi': t.confirmedAt ? format(new Date(t.confirmedAt), 'dd/MM/yyyy HH:mm') : '-',
    }))
    const ws = XLSX.utils.json_to_sheet(worksheetData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Transaksi_${activeTab}_${today}`)
    XLSX.writeFile(wb, `laporan_keuangan_${activeTab}_${today}.xlsx`)
    toast.success(`Ekspor Excel berhasil (${data.length} transaksi)`)
  }

  const exportToPDF = () => {
    const data: Transaction[] = activeTab === 'pending' ? pendingTransactions : confirmedTransactions
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`Laporan Transaksi - ${activeTab === 'pending' ? 'Pending' : 'Confirmed'}`, 14, 20)
    doc.setFontSize(10)
    doc.text(`Tanggal: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30)
    doc.text(`Total Transaksi: ${data.length}`, 14, 36)
    if (activeTab === 'confirmed') {
      doc.text(`Total Pendapatan: ${formatCurrency(totalRevenue)}`, 14, 42)
    }
    const tableData = data.map((t: Transaction) => [
      t.queue.queueNumber.toString(),
      t.patient.name,
      format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm'),
      t.amount ? formatCurrency(t.amount) : '-',
      t.paymentMethod === 'CASH' ? 'Tunai' : (t.paymentMethod === 'TRANSFER' ? 'Transfer' : '-'),
      t.confirmedAt ? format(new Date(t.confirmedAt), 'dd/MM/yyyy HH:mm') : '-',
    ])
    autoTable(doc, {
      head: [['No Antrian', 'Nama Pasien', 'Tanggal', 'Jumlah', 'Metode', 'Tanggal Konfirmasi']],
      body: tableData,
      startY: activeTab === 'confirmed' ? 50 : 44,
      theme: 'striped',
      headStyles: { fillColor: [220, 161, 161] },
    })
    doc.save(`laporan_keuangan_${activeTab}_${today}.pdf`)
    toast.success(`Ekspor PDF berhasil (${data.length} transaksi)`)
  }

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen">
      <main className="p-8 lg:p-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-headline font-bold text-primary tracking-tight">
              Keuangan
            </h2>
            <p className="text-on-surface-variant mt-2 font-medium opacity-70">
              Kelola transaksi dan pendapatan klinik dengan presisi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportToExcel}
              className="px-6 py-3 rounded-full border border-outline-variant/30 text-primary/80 font-label font-bold text-sm hover:bg-white/50 transition-all"
            >
              Ekspor Excel
            </button>
            <button
              onClick={exportToPDF}
              className="px-6 py-3 rounded-full border border-outline-variant/30 text-primary/80 font-label font-bold text-sm hover:bg-white/50 transition-all"
            >
              Ekspor PDF
            </button>
            <Link href="/admin/finance/reconcile">
              <button className="px-8 py-3 rounded-full border-2 border-primary/30 bg-white/80 backdrop-blur-sm text-primary font-extrabold text-sm shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 hover:bg-white hover:border-primary/50">
                <span className="material-symbols-outlined text-lg text-primary">account_balance</span>
                Rekonsiliasi Hari ini
              </button>
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
              </div>
            </div>
            <p className="text-on-surface-variant text-xs font-label font-bold uppercase tracking-wider mb-1">Total Pendapatan Hari Ini</p>
            <h3 className="font-headline text-3xl font-extrabold text-primary/80">{formatCurrency(totalRevenue)}</h3>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-container text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
              </div>
              <span className="text-primary text-xs font-bold bg-primary/10 px-2 py-1 rounded-full">{pendingTransactions.length} Tertunda</span>
            </div>
            <p className="text-on-surface-variant text-xs font-label font-bold uppercase tracking-wider mb-1">Pending Transaksi</p>
            <h3 className="font-headline text-3xl font-extrabold text-primary/80">{formatCurrency(totalPending)}</h3>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <span className="text-on-surface-variant text-xs font-bold bg-surface-variant/50 px-2 py-1 rounded-full">{confirmedTransactions.length} Sukses</span>
            </div>
            <p className="text-on-surface-variant text-xs font-label font-bold uppercase tracking-wider mb-1">Confirmed Transaksi</p>
            <h3 className="font-headline text-3xl font-extrabold text-primary/80">{formatCurrency(totalRevenue)}</h3>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-[2rem] shadow-ambient overflow-hidden border border-white/20">
          <div className="flex items-center gap-2 p-4 border-b border-outline-variant/10 bg-surface-container-low/20">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-2 rounded-full font-label font-bold text-sm transition-all ${
                activeTab === 'pending'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-on-surface-variant hover:bg-white/50'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab('confirmed')}
              className={`px-6 py-2 rounded-full font-label font-bold text-sm transition-all ${
                activeTab === 'confirmed'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-on-surface-variant hover:bg-white/50'
              }`}
            >
              Confirmed
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/40">
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest">No Antrian</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest">Nama Pasien</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest hidden sm:table-cell">Tanggal</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest">Total Tagihan</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {activeTab === 'pending' && pendingLoading && (
                  <tr><td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant">Memuat data...</td></tr>
                )}
                {activeTab === 'pending' && pendingTransactions.length === 0 && !pendingLoading && (
                  <tr><td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant">Tidak ada transaksi pending</td></tr>
                )}
                {activeTab === 'pending' && pendingTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-container-low/30 transition-colors group">
                    <td className="px-8 py-6 font-headline font-black text-base text-primary/80">
                      #{t.queue.queueNumber.toString().padStart(3, '0')}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold uppercase">
                          {t.patient.name.charAt(0)}
                        </div>
                        <span className="font-body font-medium text-on-surface/90">{t.patient.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 hidden sm:table-cell font-body text-on-surface-variant/80">
                      {format(new Date(t.createdAt), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                    </td>
                    <td className="px-8 py-6 font-body font-bold text-primary/90">
                      {t.amount ? formatCurrency(t.amount) : '-'}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Link href={`/admin/finance/confirm/${t.id}`}>
                        <button className="px-5 py-1.5 rounded-full border border-primary/70 text-primary/80 font-label text-xs font-bold hover:bg-primary/5 transition-all">
                          Konfirmasi
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {activeTab === 'confirmed' && confirmedLoading && (
                  <tr><td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant">Memuat data...</td></tr>
                )}
                {activeTab === 'confirmed' && confirmedTransactions.length === 0 && !confirmedLoading && (
                  <tr><td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant">Tidak ada transaksi confirmed</td></tr>
                )}
                {activeTab === 'confirmed' && confirmedTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-container-low/30 transition-colors group">
                    <td className="px-8 py-6 font-headline font-black text-base text-primary/80">
                      #{t.queue.queueNumber.toString().padStart(3, '0')}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold uppercase">
                          {t.patient.name.charAt(0)}
                        </div>
                        <span className="font-body font-medium text-on-surface/90">{t.patient.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 hidden sm:table-cell font-body text-on-surface-variant/80">
                      {format(new Date(t.createdAt), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                    </td>
                    <td className="px-8 py-6 font-body font-bold text-primary/90">
                      {t.amount ? formatCurrency(t.amount) : '-'}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-secondary font-label text-xs font-bold">Confirmed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
// app/admin/finance/page.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const queryClient = useQueryClient()
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [confirmAmount, setConfirmAmount] = useState('')
  const [confirmMethod, setConfirmMethod] = useState<'CASH' | 'TRANSFER'>('CASH')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
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

  const confirmMutation = useMutation({
    mutationFn: async ({ id, amount, paymentMethod, proof }: { id: number; amount: number; paymentMethod: string; proof?: File }) => {
      const formData = new FormData()
      formData.append('amount', amount.toString())
      formData.append('paymentMethod', paymentMethod)
      if (proof) formData.append('proof', proof)
      const res = await fetch(`/api/finance/transactions/${id}/confirm`, { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal konfirmasi')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Transaksi berhasil dikonfirmasi')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setConfirmDialogOpen(false)
      setSelectedTransaction(null)
      setConfirmAmount('')
      setProofFile(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const handleConfirm = () => {
    if (!selectedTransaction) return
    const amountNum = parseFloat(confirmAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Amount harus lebih dari 0')
      return
    }
    confirmMutation.mutate({
      id: selectedTransaction.id,
      amount: amountNum,
      paymentMethod: confirmMethod,
      proof: confirmMethod === 'TRANSFER' ? proofFile || undefined : undefined,
    })
  }

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
    <div className="min-h-screen p-6">
      <h2 className="font-display font-bold text-2xl tracking-tight text-on-surface mb-8">Keuangan</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white/60 backdrop-blur-sm rounded-[2.5rem] p-8 border border-white/50 shadow-soft-3d">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-primary/5">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
            </div>
            <div className="bg-secondary/10 text-secondary text-[11px] font-bold px-3 py-1 rounded-lg border border-secondary/20">+12.5%</div>
          </div>
          <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Total Pendapatan Hari Ini</p>
          <h3 className="text-3xl font-display font-black text-on-surface tracking-tight">{formatCurrency(totalRevenue)}</h3>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-[2.5rem] p-8 border border-white/50 shadow-soft-3d">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-primary-container/5">
              <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
            </div>
            <div className="bg-primary/10 text-primary text-[11px] font-bold px-3 py-1 rounded-lg border border-primary/20">{pendingTransactions.length} Tertunda</div>
          </div>
          <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Pending Transaksi</p>
          <h3 className="text-3xl font-display font-black text-on-surface tracking-tight">{formatCurrency(totalPending)}</h3>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-[2.5rem] p-8 border border-white/50 shadow-soft-3d">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-secondary/5">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div className="bg-surface-variant/50 text-on-surface-variant text-[11px] font-bold px-3 py-1 rounded-lg border border-outline-variant/30">{confirmedTransactions.length} Sukses</div>
          </div>
          <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-1 opacity-70">Confirmed Transaksi</p>
          <h3 className="text-3xl font-display font-black text-on-surface tracking-tight">{formatCurrency(totalRevenue)}</h3>
        </div>
      </div>

      {/* Export & Reconcile Buttons Row */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">table_chart</span> Ekspor Excel
          </button>
          <button
            onClick={exportToPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span> Ekspor PDF
          </button>
        </div>
        <Link href="/admin/finance/reconcile">
          <button className="bg-gradient-to-r from-[#dca1a1] to-[#9e6465] text-white px-8 py-2 rounded-2xl font-extrabold flex items-center gap-2 active:scale-95 transition-all shadow-md text-sm">
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
            Rekonsiliasi Hari ini
          </button>
        </Link>
      </div>

      {/* Main Table Card */}
      <div className="bg-white/60 backdrop-blur-sm rounded-[3rem] p-6 border border-white/50 shadow-soft-3d">
        <div className="flex items-center gap-2 mb-8 bg-surface-container/30 w-fit p-1.5 rounded-[1.5rem] border border-white/40">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-10 py-3 rounded-[1.25rem] font-bold text-sm flex items-center gap-2 transition-all ${
              activeTab === 'pending'
                ? 'bg-white text-[#663a3b] shadow-sm border border-primary/5'
                : 'text-on-surface-variant/60 hover:text-primary hover:bg-white/50'
            }`}
          >
            {activeTab === 'pending' && <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>}
            Pending
          </button>
          <button
            onClick={() => setActiveTab('confirmed')}
            className={`px-10 py-3 rounded-[1.25rem] font-bold text-sm transition-all ${
              activeTab === 'confirmed'
                ? 'bg-white text-[#663a3b] shadow-sm border border-primary/5'
                : 'text-on-surface-variant/60 hover:text-primary hover:bg-white/50'
            }`}
          >
            Confirmed
          </button>
        </div>

        <div className="bg-white/40 rounded-[2rem] overflow-hidden border border-white/60">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/30">
                <th className="py-7 px-10 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/70">No Antrian</th>
                <th className="py-7 px-10 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/70">Nama Pasien</th>
                <th className="py-7 px-10 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/70">Tanggal</th>
                <th className="py-7 px-10 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/70">Total Tagihan</th>
                <th className="py-7 px-10 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/70 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {activeTab === 'pending' && pendingLoading && (
                <tr><td colSpan={5} className="text-center py-10">Loading...</td></tr>
              )}
              {activeTab === 'pending' && pendingTransactions.length === 0 && !pendingLoading && (
                <tr><td colSpan={5} className="text-center py-10">Tidak ada transaksi pending</td></tr>
              )}
              {activeTab === 'pending' && pendingTransactions.map((t: Transaction) => (
                <tr key={t.id} className="group hover:bg-white/60 transition-all duration-300">
                  <td className="py-6 px-10">
                    <span className="font-display font-black text-on-surface/90 text-sm tracking-tight bg-white px-3 py-1 rounded-lg border border-primary/5 shadow-sm">
                      #{t.queue.queueNumber.toString().padStart(3, '0')}
                    </span>
                  </td>
                  <td className="py-6 px-10">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-primary-fixed-dim/30 border border-primary-fixed flex items-center justify-center font-bold text-primary text-xs shadow-sm">
                        {t.patient.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface text-sm">{t.patient.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-10 text-sm font-medium text-on-surface-variant/80">
                    {format(new Date(t.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                  </td>
                  <td className="py-6 px-10 text-sm font-black text-[#663a3b]">
                    {t.amount ? formatCurrency(t.amount) : '-'}
                  </td>
                  <td className="py-6 px-10 text-right">
                    <button
                      onClick={() => {
                        setSelectedTransaction(t)
                        setConfirmAmount(t.amount?.toString() || '')
                        setConfirmMethod(t.paymentMethod === 'TRANSFER' ? 'TRANSFER' : 'CASH')
                        setConfirmDialogOpen(true)
                      }}
                      className="bg-[#fdf0f0] text-primary border border-primary/20 hover:bg-primary hover:text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 shadow-sm active:scale-95"
                    >
                      Konfirmasi
                    </button>
                  </td>
                </tr>
              ))}
              {activeTab === 'confirmed' && confirmedLoading && (
                <tr><td colSpan={5} className="text-center py-10">Loading...</td></tr>
              )}
              {activeTab === 'confirmed' && confirmedTransactions.length === 0 && !confirmedLoading && (
                <tr><td colSpan={5} className="text-center py-10">Tidak ada transaksi confirmed</td></tr>
              )}
              {activeTab === 'confirmed' && confirmedTransactions.map((t: Transaction) => (
                <tr key={t.id} className="group hover:bg-white/60 transition-all duration-300">
                  <td className="py-6 px-10">
                    <span className="font-display font-black text-on-surface/90 text-sm tracking-tight bg-white px-3 py-1 rounded-lg border border-primary/5 shadow-sm">
                      #{t.queue.queueNumber.toString().padStart(3, '0')}
                    </span>
                  </td>
                  <td className="py-6 px-10">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-secondary-container/20 border border-secondary/20 flex items-center justify-center font-bold text-secondary text-xs shadow-sm">
                        {t.patient.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface text-sm">{t.patient.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-10 text-sm font-medium text-on-surface-variant/80">
                    {format(new Date(t.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                  </td>
                  <td className="py-6 px-10 text-sm font-black text-[#663a3b]">
                    {t.amount ? formatCurrency(t.amount) : '-'}
                  </td>
                  <td className="py-6 px-10 text-right">
                    <span className="text-secondary text-xs font-bold">Confirmed</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog Konfirmasi */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Jumlah (Rp)</Label>
              <Input
                type="number"
                value={confirmAmount}
                onChange={(e) => setConfirmAmount(e.target.value)}
                placeholder="Masukkan jumlah"
              />
            </div>
            <div>
              <Label>Metode Pembayaran</Label>
              <Select value={confirmMethod} onValueChange={(v: any) => setConfirmMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Tunai</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {confirmMethod === 'TRANSFER' && (
              <div>
                <Label>Upload Bukti Transfer</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
              </div>
            )}
            <Button onClick={handleConfirm} disabled={confirmMutation.isPending}>
              {confirmMutation.isPending ? 'Memproses...' : 'Konfirmasi'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
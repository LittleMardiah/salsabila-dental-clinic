// app/admin/finance/confirm/[id]/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { toast } from 'sonner'

interface TransactionDetail {
  id: number
  queueId: number
  patientId: number
  amount: number | null
  paymentMethod: string | null
  status: 'PENDING' | 'CONFIRMED'
  receiptUrl: string | null
  createdAt: string
  patient: {
    id: number
    name: string
    phone: string | null
    email: string | null
  }
  queue: {
    queueNumber: number
    date: string
  }
}

export default function ConfirmPaymentPage() {
  const params = useParams()
  const transactionId = params.id as string
  const router = useRouter()
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmAmount, setConfirmAmount] = useState('')
  const [confirmMethod, setConfirmMethod] = useState<'CASH' | 'TRANSFER'>('CASH')
  const [proofFile, setProofFile] = useState<File | null>(null)

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const res = await fetch(`/api/finance/transactions/${transactionId}`)
        if (!res.ok) throw new Error('Failed to fetch transaction')
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        setTransaction(data.transaction)
        if (data.transaction.amount) setConfirmAmount(data.transaction.amount.toString())
      } catch (error) {
        console.error(error)
        toast.error('Gagal memuat data transaksi')
        router.push('/admin/finance')
      } finally {
        setLoading(false)
      }
    }
    fetchTransaction()
  }, [transactionId, router])

  const confirmMutation = useMutation({
    mutationFn: async ({ amount, paymentMethod, proof }: { amount: number; paymentMethod: string; proof?: File }) => {
      const formData = new FormData()
      formData.append('amount', amount.toString())
      formData.append('paymentMethod', paymentMethod)
      if (proof) formData.append('proof', proof)
      const res = await fetch(`/api/finance/transactions/${transactionId}/confirm`, { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal konfirmasi')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Transaksi berhasil dikonfirmasi')
      router.push('/admin/finance')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const handleConfirm = () => {
    const amountNum = parseFloat(confirmAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Amount harus lebih dari 0')
      return
    }
    confirmMutation.mutate({
      amount: amountNum,
      paymentMethod: confirmMethod,
      proof: confirmMethod === 'TRANSFER' ? proofFile || undefined : undefined,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-on-surface-variant">Memuat data transaksi...</div>
      </div>
    )
  }

  if (!transaction) return null

  const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`
  const queueNumberFormatted = `A-${transaction.queue.queueNumber.toString().padStart(2, '0')}`

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-10">
        <Link
          href="/admin/finance"
          className="flex items-center gap-2 text-primary font-medium hover:translate-x-[-4px] transition-transform duration-300 group w-fit"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-label">Kembali</span>
        </Link>
        <div>
          {/* PERUBAHAN: warna headline dari text-on-surface menjadi text-primary */}
          <h2 className="text-4xl font-bold font-headline text-primary tracking-tight">Konfirmasi Pembayaran</h2>
          <p className="text-on-surface-variant font-display text-lg mt-1">Verifikasi detail transaksi dan selesaikan administrasi pasien.</p>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Transaction Info Card */}
        <div className="lg:col-span-5">
          <div className="glass-card shadow-ambient border-none rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary-container/20 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-1">Nomor Antrian</p>
                  <h3 className="text-5xl font-extrabold text-primary font-headline">{queueNumberFormatted}</h3>
                </div>
                <div className="bg-secondary/10 text-secondary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  Active Treatment
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <span className="text-xs text-on-surface-variant/70 font-semibold mb-1 block">Nama Pasien</span>
                  <span className="text-xl font-bold text-on-surface">{transaction.patient.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-on-surface-variant/70 font-semibold mb-1 block">Tanggal Transaksi</span>
                    <span className="text-md font-medium text-on-surface">
                      {format(new Date(transaction.createdAt), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-on-surface-variant/70 font-semibold mb-1 block">Status</span>
                    <span className="text-md font-medium text-primary">Pending Payment</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-outline-variant/15">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-semibold text-on-surface-variant">Total Tagihan Sebelumnya</span>
                    <span className="text-2xl font-bold text-on-surface">
                      {transaction.amount ? formatCurrency(transaction.amount) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Confirmation Form Card */}
        <div className="lg:col-span-7">
          <div className="glass-card shadow-ambient border-none rounded-3xl p-10 h-full flex flex-col">
            <h4 className="text-2xl font-bold text-on-surface font-headline mb-8">Detail Konfirmasi</h4>
            <div className="space-y-8 flex-grow">
              {/* Amount Input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-on-surface-variant ml-1">Jumlah Pembayaran (Rp)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <span className="text-primary font-bold">Rp</span>
                  </div>
                  <input
                    type="text"
                    value={confirmAmount}
                    onChange={(e) => setConfirmAmount(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-2xl py-5 pl-14 pr-6 text-2xl font-extrabold text-on-surface-variant shadow-inner focus:ring-2 focus:ring-primary/20 transition-all placeholder-on-surface-variant/30"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-on-surface-variant ml-1">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-4">
                  <label
                    className={`relative flex items-center justify-center p-4 rounded-2xl bg-surface-container-low border-2 cursor-pointer hover:bg-surface-container-high transition-all ${
                      confirmMethod === 'CASH'
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="CASH"
                      checked={confirmMethod === 'CASH'}
                      onChange={() => setConfirmMethod('CASH')}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <span className="material-symbols-outlined text-primary">payments</span>
                      <span className="text-sm font-bold">Tunai</span>
                    </div>
                  </label>
                  <label
                    className={`relative flex items-center justify-center p-4 rounded-2xl bg-surface-container-low border-2 cursor-pointer hover:bg-surface-container-high transition-all ${
                      confirmMethod === 'TRANSFER'
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="TRANSFER"
                      checked={confirmMethod === 'TRANSFER'}
                      onChange={() => setConfirmMethod('TRANSFER')}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <span className="material-symbols-outlined text-primary">account_balance</span>
                      <span className="text-sm font-bold">Transfer</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Conditional File Upload */}
              {confirmMethod === 'TRANSFER' && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-on-surface-variant ml-1">Unggah Bukti Transfer</label>
                  <div className="border-2 border-dashed border-outline-variant/30 rounded-2xl p-8 flex flex-col items-center justify-center bg-surface-container-low/30 hover:bg-surface-container-low transition-all cursor-pointer group">
                    <input
                      type="file"
                      id="proof-upload"
                      accept="image/*,.pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label htmlFor="proof-upload" className="cursor-pointer flex flex-col items-center w-full">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant/50 group-hover:text-primary transition-colors mb-2">cloud_upload</span>
                      <p className="text-sm font-medium text-on-surface-variant text-center">
                        {proofFile ? proofFile.name : 'Klik untuk mengunggah atau seret file'}
                      </p>
                      <p className="text-xs text-on-surface-variant/50 mt-1">Format: JPG, PNG, PDF (Maks. 10MB)</p>
                    </label>
                  </div>
                </div>
              )}

              {/* CTA Button */}
              <div className="pt-6">
                <button
                  onClick={handleConfirm}
                  disabled={confirmMutation.isPending}
                  className="w-full primary-gradient text-on-primary font-bold py-5 rounded-2xl shadow-lg hover:shadow-ambient hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">verified</span>
                  <span>{confirmMutation.isPending ? 'Memproses...' : 'Konfirmasi Pembayaran'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
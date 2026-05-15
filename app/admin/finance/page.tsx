'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false)
  const [reconcileAmount, setReconcileAmount] = useState('')
  const [reconcileNotes, setReconcileNotes] = useState('')
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['transactions', 'pending'],
    queryFn: async () => {
      const res = await fetch(`/api/finance/transactions?status=PENDING&date=${today}`)
      if (!res.ok) throw new Error('Failed to fetch pending transactions')
      return res.json()
    },
  })

  const { data: confirmedData, isLoading: confirmedLoading } = useQuery({
    queryKey: ['transactions', 'confirmed'],
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
      const res = await fetch(`/api/finance/transactions/${id}/confirm`, {
        method: 'POST',
        body: formData,
      })
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
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const reconcileMutation = useMutation({
    mutationFn: async ({ date, totalRecorded, notes }: { date: string; totalRecorded: number; notes: string }) => {
      const res = await fetch('/api/finance/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, totalRecorded, notes }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal rekonsiliasi')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Rekonsiliasi harian disimpan')
      setReconcileDialogOpen(false)
      setReconcileAmount('')
      setReconcileNotes('')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
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

  const handleReconcile = () => {
    const amountNum = parseFloat(reconcileAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Total harus lebih dari 0')
      return
    }
    reconcileMutation.mutate({
      date: today,
      totalRecorded: amountNum,
      notes: reconcileNotes,
    })
  }

  const totalRevenue = confirmedData?.data?.reduce((sum: number, t: Transaction) => sum + (t.amount || 0), 0) || 0

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Manajemen Keuangan</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalRevenue.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingData?.data?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmedData?.data?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No Antrian</TableHead>
                  <TableHead>Nama Pasien</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
                ) : pendingData?.data?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center">Tidak ada transaksi pending</TableCell></TableRow>
                ) : (
                  pendingData?.data?.map((t: Transaction) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.queue.queueNumber}</TableCell>
                      <TableCell>{t.patient.name}</TableCell>
                      <TableCell>{format(new Date(t.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}</TableCell>
                      <TableCell>
                        <Dialog open={confirmDialogOpen && selectedTransaction?.id === t.id} onOpenChange={(open) => {
                          if (open) setSelectedTransaction(t)
                          else setSelectedTransaction(null)
                          setConfirmDialogOpen(open)
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm">Konfirmasi</Button>
                          </DialogTrigger>
                          <DialogContent>
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
                                  <Input type="file" accept="image/*,.pdf" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                                </div>
                              )}
                              <Button onClick={handleConfirm} disabled={confirmMutation.isPending}>
                                {confirmMutation.isPending ? 'Memproses...' : 'Konfirmasi'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="confirmed">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No Antrian</TableHead>
                  <TableHead>Nama Pasien</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Tanggal Konfirmasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confirmedLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
                ) : confirmedData?.data?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Tidak ada transaksi confirmed</TableCell></TableRow>
                ) : (
                  confirmedData?.data?.map((t: Transaction) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.queue.queueNumber}</TableCell>
                      <TableCell>{t.patient.name}</TableCell>
                      <TableCell>Rp {t.amount?.toLocaleString('id-ID')}</TableCell>
                      <TableCell>{t.paymentMethod === 'CASH' ? 'Tunai' : 'Transfer'}</TableCell>
                      <TableCell>{t.confirmedAt ? format(new Date(t.confirmedAt), 'dd MMM yyyy, HH:mm', { locale: id }) : '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Dialog open={reconcileDialogOpen} onOpenChange={setReconcileDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Reconcile Today</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rekonsiliasi Harian</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Total Pemasukan (Rp)</Label>
                <Input
                  type="number"
                  value={reconcileAmount}
                  onChange={(e) => setReconcileAmount(e.target.value)}
                  placeholder="Total sesuai laporan"
                />
              </div>
              <div>
                <Label>Catatan (Opsional)</Label>
                <Input
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  placeholder="Contoh: Berdasarkan laporan bank"
                />
              </div>
              <Button onClick={handleReconcile} disabled={reconcileMutation.isPending}>
                {reconcileMutation.isPending ? 'Menyimpan...' : 'Simpan Rekonsiliasi'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
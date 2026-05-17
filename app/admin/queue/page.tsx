'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import QueueCodeModal from '@/components/admin/QueueCodeModal'

type QueueItem = {
  id: number
  queueNumber: number
  patientName: string
  phone: string | null
  email: string | null
  status: 'WAITING' | 'CALLED' | 'COMPLETED'
  calledAt: string | null
  completedAt: string | null
  createdAt: string
  patientCode?: string | null
}

async function fetchQueues(): Promise<QueueItem[]> {
  const res = await fetch('/api/queue')
  if (!res.ok) throw new Error('Failed to fetch queues')
  const data = await res.json()
  return data.data
}

async function callQueue(): Promise<void> {
  const res = await fetch('/api/queue/call', { method: 'POST' })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to call queue')
  }
}

async function completeQueue(id: number): Promise<void> {
  const res = await fetch(`/api/queue/${id}/complete`, { method: 'PATCH' })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to complete queue')
  }
}

async function addPatient(data: {
  name: string
  phone?: string
  email?: string
  keluhan?: string
  mode: 'ONLINE' | 'MANUAL'
}): Promise<{ queue_number: number; patient_code?: string }> {
  const res = await fetch('/api/queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to add patient')
  }
  return res.json()
}

export default function QueuePage() {
  const queryClient = useQueryClient()
  const [onlineModalOpen, setOnlineModalOpen] = useState(false)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [onlineForm, setOnlineForm] = useState({ name: '', phone: '', email: '', keluhan: '' })
  const [manualForm, setManualForm] = useState({ name: '', phone: '' })
  const [codeModalOpen, setCodeModalOpen] = useState(false)
  const [modalQueueNumber, setModalQueueNumber] = useState<number | null>(null)
  const [modalPatientCode, setModalPatientCode] = useState<string | null>(null)

  const { data: queues = [], isLoading, error } = useQuery({
    queryKey: ['queues'],
    queryFn: fetchQueues,
    refetchInterval: 5000,
  })

  const callMutation = useMutation({
    mutationFn: callQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      toast.success('Antrian berhasil dipanggil')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const completeMutation = useMutation({
    mutationFn: completeQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      toast.success('Antrian selesai')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const addOnlineMutation = useMutation({
    mutationFn: addPatient,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      setOnlineModalOpen(false)
      setOnlineForm({ name: '', phone: '', email: '', keluhan: '' })
      toast.success(`Pasien online ditambahkan. Kode: ${data.patient_code}`)
      if (data.patient_code) {
        setModalQueueNumber(data.queue_number)
        setModalPatientCode(data.patient_code)
        setCodeModalOpen(true)
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const addManualMutation = useMutation({
    mutationFn: addPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      setManualModalOpen(false)
      setManualForm({ name: '', phone: '' })
      toast.success('Pasien manual ditambahkan')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleOnlineSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!onlineForm.name.trim()) {
      toast.error('Nama wajib diisi')
      return
    }
    addOnlineMutation.mutate({ ...onlineForm, mode: 'ONLINE' })
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualForm.name.trim()) {
      toast.error('Nama wajib diisi')
      return
    }
    addManualMutation.mutate({
      name: manualForm.name,
      phone: manualForm.phone || undefined,
      mode: 'MANUAL',
    })
  }

  const handleQueueNumberClick = (queueNumber: number, patientCode: string | null | undefined) => {
    if (patientCode) {
      setModalQueueNumber(queueNumber)
      setModalPatientCode(patientCode)
      setCodeModalOpen(true)
    }
  }

  const totalQueues = queues.length
  const waitingQueues = queues.filter(q => q.status === 'WAITING').length
  const calledQueues = queues.filter(q => q.status === 'CALLED').length

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'WAITING': return 'Menunggu'
      case 'CALLED': return 'Dipanggil'
      case 'COMPLETED': return 'Selesai'
      default: return status
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'WAITING': return 'bg-primary-container/20 text-primary'
      case 'CALLED': return 'bg-secondary-container/30 text-secondary'
      case 'COMPLETED': return 'bg-outline-variant/30 text-on-surface-variant'
      default: return 'bg-surface-container-high text-on-surface-variant'
    }
  }

  const formatQueueNumber = (num: number) => `A-${num.toString().padStart(2, '0')}`

  if (isLoading) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center">
        <div className="text-center text-error p-4">Error loading queues: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen">
      <main className="p-8 lg:p-12">
        {/* Header */}
        <header className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-headline font-bold text-primary tracking-tight">
              Manajemen Antrian
            </h2>
            <p className="text-on-surface-variant mt-2 font-medium opacity-70">
              Kelola antrian pasien harian dengan sistem panggil otomatis.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setManualModalOpen(true)}
              className="px-6 py-3 rounded-full border border-outline-variant/30 text-primary/80 font-label font-bold text-sm hover:bg-primary/5 transition-all"
            >
              Manual Registration
            </button>
            <button
              onClick={() => setOnlineModalOpen(true)}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#DCA1A1] to-[#663a3b] text-white font-label font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[0.98] transition-all"
            >
              Online Registration
            </button>
          </div>
        </header>

        {/* Statistik Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-ambient border border-outline-variant/5">
            <p className="text-on-surface-variant text-xs font-label font-bold uppercase tracking-widest mb-1">Total Antrian</p>
            <h3 className="font-headline text-3xl font-extrabold text-primary/80">{totalQueues}</h3>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-ambient border border-outline-variant/5">
            <p className="text-on-surface-variant text-xs font-label font-bold uppercase tracking-widest mb-1">Menunggu</p>
            <h3 className="font-headline text-3xl font-extrabold text-primary/80">{waitingQueues}</h3>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-ambient border border-outline-variant/5">
            <p className="text-on-surface-variant text-xs font-label font-bold uppercase tracking-widest mb-1">Sedang Dilayani</p>
            <h3 className="font-headline text-3xl font-extrabold text-secondary/80">{calledQueues}</h3>
          </div>
        </div>

        {/* Tabel Antrian */}
        <div className="bg-surface-container-lowest rounded-[2rem] shadow-ambient overflow-hidden border border-white/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/40">
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest">No</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest">Nama Pasien</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest hidden sm:table-cell">Kontak</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest hidden md:table-cell">Waktu Daftar</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest">Status</th>
                  <th className="px-8 py-6 font-headline text-primary text-xs font-extrabold uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {queues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-on-surface-variant">
                      Tidak ada antrian hari ini.
                    </td>
                  </tr>
                ) : (
                  queues.map((queue) => (
                    <tr key={queue.id} className="hover:bg-surface-container-low/30 transition-colors group">
                      <td
                        className="px-8 py-6 font-headline font-black text-base cursor-pointer hover:text-primary/70 transition-colors"
                        onClick={() => handleQueueNumberClick(queue.queueNumber, (queue as any).patientCode)}
                      >
                        {formatQueueNumber(queue.queueNumber)}
                      </td>
                      <td className="px-8 py-6 font-body font-medium text-on-surface/90">{queue.patientName}</td>
                      <td className="px-8 py-6 hidden sm:table-cell">
                        <div className="flex gap-2">
                          {queue.phone && (
                            <a
                              href={`tel:${queue.phone}`}
                              className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-outline-variant transition-colors"
                            >
                              <span className="material-symbols-outlined text-on-surface-variant/70 text-base">call</span>
                            </a>
                          )}
                          {queue.email && (
                            <a
                              href={`mailto:${queue.email}`}
                              className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-outline-variant transition-colors"
                            >
                              <span className="material-symbols-outlined text-on-surface-variant/70 text-base">mail</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 font-body font-medium text-on-surface-variant/80 hidden md:table-cell">
                        {format(new Date(queue.createdAt), 'HH:mm', { locale: id })}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 text-[10px] font-label font-black uppercase rounded-full tracking-wider ${getStatusBadgeClass(queue.status)}`}>
                          {getStatusLabel(queue.status)}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {queue.status === 'WAITING' && (
                          <button
                            onClick={() => callMutation.mutate()}
                            disabled={callMutation.isPending}
                            className="px-5 py-1.5 rounded-full border border-primary/70 text-primary/80 font-label text-xs font-bold hover:bg-primary/5 transition-all disabled:opacity-50"
                          >
                            Panggil
                          </button>
                        )}
                        {queue.status === 'CALLED' && (
                          <button
                            onClick={() => completeMutation.mutate(queue.id)}
                            disabled={completeMutation.isPending}
                            className="px-5 py-1.5 rounded-full bg-primary/80 text-white font-label text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                          >
                            Selesai
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
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

      {/* Modal Online Registration */}
      <Dialog open={onlineModalOpen} onOpenChange={setOnlineModalOpen}>
        <DialogContent className="bg-surface-container-lowest rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="font-headline font-bold text-xl text-primary/80">Tambah Pasien Online</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOnlineSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="online-name" className="font-label text-sm font-bold text-on-surface/80">Nama Lengkap *</Label>
              <Input id="online-name" value={onlineForm.name} onChange={(e) => setOnlineForm({ ...onlineForm, name: e.target.value })} className="bg-surface-container-low border-none rounded-xl" required />
            </div>
            <div>
              <Label htmlFor="online-phone" className="font-label text-sm font-bold text-on-surface/80">No. Telepon</Label>
              <Input id="online-phone" value={onlineForm.phone} onChange={(e) => setOnlineForm({ ...onlineForm, phone: e.target.value })} className="bg-surface-container-low border-none rounded-xl" />
            </div>
            <div>
              <Label htmlFor="online-email" className="font-label text-sm font-bold text-on-surface/80">Email</Label>
              <Input id="online-email" type="email" value={onlineForm.email} onChange={(e) => setOnlineForm({ ...onlineForm, email: e.target.value })} className="bg-surface-container-low border-none rounded-xl" />
            </div>
            <div>
              <Label htmlFor="online-keluhan" className="font-label text-sm font-bold text-on-surface/80">Keluhan</Label>
              <Input id="online-keluhan" value={onlineForm.keluhan} onChange={(e) => setOnlineForm({ ...onlineForm, keluhan: e.target.value })} className="bg-surface-container-low border-none rounded-xl" />
            </div>
            <button
              type="submit"
              disabled={addOnlineMutation.isPending}
              className="w-full bg-gradient-to-r from-[#DCA1A1] to-[#663a3b] text-white font-headline font-bold py-3 rounded-full transition-all disabled:opacity-70"
            >
              {addOnlineMutation.isPending ? 'Memproses...' : 'Simpan & Generate Kode'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Manual Registration */}
      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className="bg-surface-container-lowest rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="font-headline font-bold text-xl text-primary/80">Tambah Pasien Manual</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleManualSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="manual-name" className="font-label text-sm font-bold text-on-surface/80">Nama Lengkap *</Label>
              <Input id="manual-name" value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} className="bg-surface-container-low border-none rounded-xl" required />
            </div>
            <div>
              <Label htmlFor="manual-phone" className="font-label text-sm font-bold text-on-surface/80">No. Telepon (opsional)</Label>
              <Input id="manual-phone" value={manualForm.phone} onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })} className="bg-surface-container-low border-none rounded-xl" />
            </div>
            <button
              type="submit"
              disabled={addManualMutation.isPending}
              className="w-full border border-primary/70 text-primary/80 font-headline font-bold py-3 rounded-full transition-all hover:bg-primary/5 disabled:opacity-70"
            >
              {addManualMutation.isPending ? 'Memproses...' : 'Simpan'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Kode Antrian */}
      <QueueCodeModal
        open={codeModalOpen}
        onOpenChange={setCodeModalOpen}
        queueNumber={modalQueueNumber ?? 0}
        patientCode={modalPatientCode}
      />
    </div>
  )
}
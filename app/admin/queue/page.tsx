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
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (error) {
    return <div className="text-center text-error p-4">Error loading queues: {error.message}</div>
  }

  return (
    <>
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="font-headline font-bold text-2xl tracking-tight text-on-surface">Manajemen Antrian</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Sistem Aktif</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => setManualModalOpen(true)} className="px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-outline-variant/30 text-primary font-headline font-bold text-sm hover:bg-primary/5 transition-all">
            Manual Registration
          </button>
          <button onClick={() => setOnlineModalOpen(true)} className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-[#DCA1A1] to-[#663a3b] text-white font-headline font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[0.98] transition-all">
            Online Registration
          </button>
        </div>
      </div>

      {/* Statistik Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
        <div className="bg-surface-container-lowest p-4 md:p-6 rounded-2xl shadow-sm border border-outline-variant/5">
          <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">Total Antrian</p>
          <h3 className="font-headline text-2xl md:text-3xl font-black text-on-surface">{totalQueues}</h3>
        </div>
        <div className="bg-surface-container-lowest p-4 md:p-6 rounded-2xl shadow-sm border border-outline-variant/5">
          <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">Menunggu</p>
          <h3 className="font-headline text-2xl md:text-3xl font-black text-primary">{waitingQueues}</h3>
        </div>
        <div className="bg-surface-container-lowest p-4 md:p-6 rounded-2xl shadow-sm border border-outline-variant/5">
          <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">Sedang Dilayani</p>
          <h3 className="font-headline text-2xl md:text-3xl font-black text-secondary">{calledQueues}</h3>
        </div>
      </section>

      {/* Tabel Antrian */}
      <section className="bg-surface-container-lowest rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-ambient border border-outline-variant/5 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
          <div>
            <h2 className="font-headline font-bold text-lg md:text-xl text-on-surface">Daftar Pasien Hari Ini</h2>
            <p className="text-on-surface-variant text-sm mt-1">Daftar real-time antrian klinik gigi.</p>
          </div>
        </div>

        {queues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 md:py-24 text-center">
            <div className="w-32 h-32 md:w-48 md:h-48 bg-surface-container-low rounded-full flex items-center justify-center mb-6 relative">
              <span className="material-symbols-outlined text-primary/20 text-5xl md:text-7xl" style={{ fontVariationSettings: "'wght' 200" }}>hourglass_empty</span>
              <div className="absolute -bottom-2 -right-2 bg-surface-container-lowest p-2 md:p-3 rounded-2xl shadow-sm border border-outline-variant/20">
                <span className="material-symbols-outlined text-secondary text-xl md:text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
            </div>
            <h3 className="font-headline font-bold text-base md:text-lg text-on-surface">Belum ada antrian</h3>
            <p className="text-on-surface-variant text-xs md:text-sm max-w-xs mx-auto mt-2">Semua pasien telah dilayani atau belum ada pendaftaran baru hari ini.</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['queues'] })}
              className="mt-6 md:mt-8 px-4 md:px-6 py-2 md:py-3 border border-outline-variant/40 rounded-full text-xs font-bold text-on-surface-variant hover:bg-primary/5 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Perbarui Data
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[700px] md:min-w-full w-full text-left border-separate border-spacing-y-3 md:border-spacing-y-4">
              <thead className="text-on-surface-variant text-[10px] uppercase tracking-[0.15em] font-black">
                <tr>
                  <th className="pb-3 pl-4 md:pl-6">No</th>
                  <th className="pb-3">Nama Pasien</th>
                  <th className="pb-3 hidden sm:table-cell">Kontak</th>
                  <th className="pb-3 hidden md:table-cell">Waktu Daftar</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-4 md:pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-xs md:text-sm font-body">
                {queues.map((queue) => (
                  <tr key={queue.id} className={`${queue.status === 'CALLED' ? 'bg-surface-container-low/50' : 'bg-surface-container-lowest border border-outline-variant/10'} hover:bg-surface-container-low transition-colors rounded-2xl overflow-hidden shadow-sm`}>
                    <td
                      className="py-3 md:py-5 pl-4 md:pl-6 font-headline font-black text-base md:text-lg rounded-l-2xl cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleQueueNumberClick(queue.queueNumber, (queue as any).patientCode)}
                    >
                      {formatQueueNumber(queue.queueNumber)}
                    </td>
                    <td className="py-3 md:py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface">{queue.patientName}</span>
                      </div>
                    </td>
                    <td className="py-3 md:py-5 hidden sm:table-cell">
                      <div className="flex gap-1 md:gap-2">
                        {queue.phone && <a href={`tel:${queue.phone}`} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-outline-variant transition-colors"><span className="material-symbols-outlined text-on-surface-variant text-sm md:text-base">call</span></a>}
                        {queue.email && <a href={`mailto:${queue.email}`} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-outline-variant transition-colors"><span className="material-symbols-outlined text-on-surface-variant text-sm md:text-base">mail</span></a>}
                      </div>
                    </td>
                    <td className="py-3 md:py-5 font-medium text-on-surface-variant hidden md:table-cell">{format(new Date(queue.createdAt), 'HH:mm', { locale: id })}</td>
                    <td className="py-3 md:py-5"><span className={`px-2 md:px-3 py-1 text-[9px] md:text-[10px] font-black uppercase rounded-full tracking-wider ${getStatusBadgeClass(queue.status)}`}>{getStatusLabel(queue.status)}</span></td>
                    <td className="py-3 md:py-5 pr-4 md:pr-6 text-right rounded-r-2xl">
                      {queue.status === 'WAITING' && (
                        <button
                          onClick={() => callMutation.mutate()}
                          disabled={callMutation.isPending}
                          className="px-3 md:px-5 py-1.5 md:py-2 border border-primary text-primary text-[10px] md:text-xs font-bold rounded-full hover:bg-primary/5 transition-all disabled:opacity-50"
                        >
                          Panggil
                        </button>
                      )}
                      {queue.status === 'CALLED' && (
                        <button
                          onClick={() => completeMutation.mutate(queue.id)}
                          disabled={completeMutation.isPending}
                          className="px-3 md:px-5 py-1.5 md:py-2 bg-on-surface text-white text-[10px] md:text-xs font-bold rounded-full hover:bg-on-surface/80 transition-all disabled:opacity-50"
                        >
                          Selesai
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Online Registration */}
      <Dialog open={onlineModalOpen} onOpenChange={setOnlineModalOpen}>
        <DialogContent className="bg-surface-container-lowest rounded-2xl max-w-md p-4 md:p-6">
          <DialogHeader><DialogTitle className="font-headline text-lg md:text-xl">Tambah Pasien Online</DialogTitle></DialogHeader>
          <form onSubmit={handleOnlineSubmit} className="space-y-3 md:space-y-4 mt-2 md:mt-4">
            <div><Label htmlFor="online-name" className="font-body text-sm">Nama Lengkap *</Label><Input id="online-name" value={onlineForm.name} onChange={(e) => setOnlineForm({ ...onlineForm, name: e.target.value })} className="bg-surface-container-low border-none rounded-xl" required /></div>
            <div><Label htmlFor="online-phone" className="font-body text-sm">No. Telepon</Label><Input id="online-phone" value={onlineForm.phone} onChange={(e) => setOnlineForm({ ...onlineForm, phone: e.target.value })} className="bg-surface-container-low border-none rounded-xl" /></div>
            <div><Label htmlFor="online-email" className="font-body text-sm">Email</Label><Input id="online-email" type="email" value={onlineForm.email} onChange={(e) => setOnlineForm({ ...onlineForm, email: e.target.value })} className="bg-surface-container-low border-none rounded-xl" /></div>
            <div><Label htmlFor="online-keluhan" className="font-body text-sm">Keluhan</Label><Input id="online-keluhan" value={onlineForm.keluhan} onChange={(e) => setOnlineForm({ ...onlineForm, keluhan: e.target.value })} className="bg-surface-container-low border-none rounded-xl" /></div>
            <button type="submit" disabled={addOnlineMutation.isPending} className="w-full bg-gradient-to-r from-[#DCA1A1] to-[#663a3b] text-white font-headline font-bold py-2.5 md:py-3 rounded-full transition-all disabled:opacity-70 text-sm md:text-base">{addOnlineMutation.isPending ? 'Memproses...' : 'Simpan & Generate Kode'}</button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Manual Registration */}
      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className="bg-surface-container-lowest rounded-2xl max-w-md p-4 md:p-6">
          <DialogHeader><DialogTitle className="font-headline text-lg md:text-xl">Tambah Pasien Manual</DialogTitle></DialogHeader>
          <form onSubmit={handleManualSubmit} className="space-y-3 md:space-y-4 mt-2 md:mt-4">
            <div><Label htmlFor="manual-name" className="font-body text-sm">Nama Lengkap *</Label><Input id="manual-name" value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} className="bg-surface-container-low border-none rounded-xl" required /></div>
            <div><Label htmlFor="manual-phone" className="font-body text-sm">No. Telepon (opsional)</Label><Input id="manual-phone" value={manualForm.phone} onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })} className="bg-surface-container-low border-none rounded-xl" /></div>
            <button type="submit" disabled={addManualMutation.isPending} className="w-full border border-primary text-primary font-headline font-bold py-2.5 md:py-3 rounded-full transition-all hover:bg-primary/5 disabled:opacity-70 text-sm md:text-base">{addManualMutation.isPending ? 'Memproses...' : 'Simpan'}</button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal untuk menampilkan kode antrian */}
      <QueueCodeModal
        open={codeModalOpen}
        onOpenChange={setCodeModalOpen}
        queueNumber={modalQueueNumber ?? 0}
        patientCode={modalPatientCode}
      />
    </>
  )
}
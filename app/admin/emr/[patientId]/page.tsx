// app/admin/emr/[patientId]/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import EMRForm from '@/components/admin/EMRForm'
import EMRHistory from '@/components/admin/EMRHistory'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function EMREditPage() {
  const { patientId } = useParams()
  const [patient, setPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`/api/patient/${patientId}`)
        if (!res.ok) throw new Error('Failed to fetch patient')
        const data = await res.json()
        setPatient(data)
      } catch (error) {
        console.error(error)
        toast.error('Gagal memuat data pasien')
      } finally {
        setLoading(false)
      }
    }
    fetchPatient()
  }, [patientId])

  if (loading) return <div className="p-8 text-center">Memuat data pasien...</div>
  if (!patient) return <div className="p-8 text-center">Pasien tidak ditemukan</div>

  return (
    <div className="w-full max-w-full px-4 sm:px-6 md:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
          EMR - {patient.name}
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Kelola rekam medis elektronik pasien
        </p>
      </div>

      {/* Form EMR - tanpa pembatas apapun */}
      <div className="w-full">
        <EMRForm 
          patientId={Number(patientId)} 
          onSuccess={() => toast.success('EMR berhasil disimpan')}
          onHistoryClick={() => setHistoryOpen(true)}
        />
      </div>

      {/* Modal Riwayat */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto w-[calc(100%-2rem)] mx-auto rounded-2xl p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl font-bold">
              Riwayat Kunjungan - {patient.name}
            </DialogTitle>
          </DialogHeader>
          <EMRHistory patientId={Number(patientId)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
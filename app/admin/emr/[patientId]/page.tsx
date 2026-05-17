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
    <div className="bg-surface min-h-screen font-body text-on-surface">
      <main className="p-6 md:p-10 lg:p-12">
        {/* Header dengan efek 3D sederhana */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary tracking-tight drop-shadow-sm">
            EMR - {patient.name}
          </h1>
          <p className="text-on-surface-variant mt-2 font-medium">
            Kelola rekam medis elektronik pasien dengan presisi
          </p>
        </div>

        {/* Kontainer Form dengan efek bayangan 3D */}
        <div className="rounded-3xl bg-white/50 backdrop-blur-sm border border-white/60 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1),0_1px_2px_rgba(255,255,255,0.8)_inset] p-6 md:p-8 transition-all duration-300 hover:shadow-[0_30px_50px_-15px_rgba(0,0,0,0.15)]">
          <EMRForm 
            patientId={Number(patientId)} 
            onSuccess={() => toast.success('EMR berhasil disimpan')}
            onHistoryClick={() => setHistoryOpen(true)}
          />
        </div>

        {/* Modal Riwayat dengan efek 3D */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto w-[calc(100%-2rem)] mx-auto rounded-2xl p-0 border-0 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] bg-white/95 backdrop-blur-md">
            <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-white/50 p-5 rounded-t-2xl z-10">
              <DialogHeader>
                <DialogTitle className="text-xl font-headline font-bold text-primary">
                  Riwayat Kunjungan - {patient.name}
                </DialogTitle>
              </DialogHeader>
            </div>
            <div className="p-5">
              <EMRHistory patientId={Number(patientId)} />
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
// app/admin/emr/[patientId]/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    fetchPatient()
  }, [patientId])

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

  const handleHistoryClick = () => {
    setHistoryOpen(true)
  }

  if (loading) return <div>Loading...</div>
  if (!patient) return <div>Pasien tidak ditemukan</div>

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">EMR - {patient.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <EMRForm 
            patientId={Number(patientId)} 
            onSuccess={() => {
              toast.success('EMR berhasil disimpan')
            }}
            onHistoryClick={handleHistoryClick}   // ✅ kirim prop ke form
          />
        </CardContent>
      </Card>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Riwayat Kunjungan - {patient.name}</DialogTitle>
          </DialogHeader>
          <EMRHistory patientId={Number(patientId)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
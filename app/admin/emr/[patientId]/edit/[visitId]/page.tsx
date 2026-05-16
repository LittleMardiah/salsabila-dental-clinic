// app/admin/emr/[patientId]/edit/[visitId]/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import EMRForm from '@/components/admin/EMRForm'
import { toast } from 'sonner'

interface VisitData {
  id: number
  queueId: number
  keluhanUtama: string | null
  diagnosa: string
  tindakan: string
  resepObat: string | null
  catatanTambahan: string | null
  dokterPenanggungJawab: string
  followUpDate: string | null
}

export default function EditEMRPage() {
  const { patientId, visitId } = useParams()
  const router = useRouter()
  const [visit, setVisit] = useState<VisitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [patientName, setPatientName] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const patientRes = await fetch(`/api/patient/${patientId}`)
        if (!patientRes.ok) throw new Error('Failed to fetch patient')
        const patientData = await patientRes.json()
        setPatientName(patientData.name)

        const visitRes = await fetch(`/api/patient/${patientId}/emr`)
        if (!visitRes.ok) throw new Error('Failed to fetch visits')
        const visitData = await visitRes.json()
        const found = visitData.data?.find((v: any) => v.id === parseInt(visitId as string))
        if (found) {
          setVisit({
            id: found.id,
            queueId: found.queueId,
            keluhanUtama: found.keluhanUtama,
            diagnosa: found.diagnosa,
            tindakan: found.tindakan,
            resepObat: found.resepObat,
            catatanTambahan: found.catatanTambahan,
            dokterPenanggungJawab: found.dokterPenanggungJawab,
            followUpDate: found.followUpDate,
          })
        } else {
          toast.error('Data kunjungan tidak ditemukan')
          router.push(`/admin/emr/${patientId}`)
        }
      } catch (error) {
        console.error(error)
        toast.error('Gagal memuat data')
        router.push(`/admin/emr/${patientId}`)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [patientId, visitId, router])

  if (loading) return <div className="p-8 text-center">Memuat data kunjungan...</div>
  if (!visit) return <div className="p-8 text-center">Data tidak ditemukan</div>

  return (
    <div className="w-full max-w-full px-4 sm:px-6 md:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
          Edit EMR - {patientName}
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          {visit.followUpDate 
            ? `Kunjungan ${new Date(visit.followUpDate).toLocaleDateString('id-ID')}`
            : 'Perbarui rekam medis pasien'}
        </p>
      </div>

      {/* Form EMR edit */}
      <div className="w-full">
        <EMRForm
          patientId={Number(patientId)}
          initialData={{
            queueId: visit.queueId,
            keluhanUtama: visit.keluhanUtama || '',
            diagnosa: visit.diagnosa,
            tindakan: visit.tindakan,
            resepObat: visit.resepObat || '',
            catatanTambahan: visit.catatanTambahan || '',
            dokterPenanggungJawab: visit.dokterPenanggungJawab,
            followUpDate: visit.followUpDate ? visit.followUpDate.split('T')[0] : '',
          }}
          visitId={visit.id}
          onSuccess={() => {
            toast.success('EMR berhasil diperbarui')
            router.push(`/admin/emr/${patientId}`)
          }}
        />
      </div>
    </div>
  )
}
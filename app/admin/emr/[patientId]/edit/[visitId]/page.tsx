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

  if (loading) return (
    <div className="bg-surface min-h-screen flex items-center justify-center">
      <div className="text-center text-on-surface-variant">Memuat data kunjungan...</div>
    </div>
  )
  if (!visit) return (
    <div className="bg-surface min-h-screen flex items-center justify-center">
      <div className="text-center text-on-surface-variant">Data tidak ditemukan</div>
    </div>
  )

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen">
      <main className="p-8 lg:p-12">
        {/* Header */}
        <header className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-headline font-bold text-primary tracking-tight">
              Edit EMR - {patientName}
            </h2>
            <p className="text-on-surface-variant mt-2 font-medium opacity-70">
              {visit.followUpDate 
                ? `Perbarui catatan kunjungan tanggal ${new Date(visit.followUpDate).toLocaleDateString('id-ID')}`
                : 'Perbarui rekam medis pasien dengan presisi'}
            </p>
          </div>
        </header>

        {/* Form EMR edit - menggunakan diamond-glass di dalam EMRForm */}
        <div className="bg-surface-container-lowest rounded-[2rem] shadow-ambient overflow-hidden border border-white/20 p-6 md:p-8">
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

        <footer className="mt-12 text-center">
          <p className="text-xs font-label text-on-surface-variant opacity-50">
            © 2025 Salsa Dental Portal. Secured with AES-256 Clinical Grade Encryption.
          </p>
        </footer>
      </main>
    </div>
  )
}
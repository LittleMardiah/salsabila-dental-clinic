'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
        // Ambil data pasien
        const patientRes = await fetch(`/api/patient/${patientId}`)
        const patientData = await patientRes.json()
        setPatientName(patientData.name)

        // Ambil semua kunjungan, cari yang sesuai visitId
        const visitRes = await fetch(`/api/patient/${patientId}/emr`)
        const visitData = await visitRes.json()
        const found = visitData.data.find((v: any) => v.id === parseInt(visitId as string))
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

  if (loading) return <div className="p-8">Memuat...</div>
  if (!visit) return <div className="p-8">Data tidak ditemukan</div>

  return (
    <div className="px-4 md:px-8 py-8 w-full max-w-full">
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl font-bold">
            Edit EMR - {patientName}
          </CardTitle>
          <p className="text-muted-foreground">
            Kunjungan {visit.followUpDate ? new Date(visit.followUpDate).toLocaleDateString() : ''}
          </p>
        </CardHeader>
        <CardContent className="px-0">
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
        </CardContent>
      </Card>
    </div>
  )
}
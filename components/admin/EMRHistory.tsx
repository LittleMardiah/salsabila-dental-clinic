// components/admin/EMRHistory.tsx
'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { toast } from 'sonner'
import Link from 'next/link'

interface Visit {
  id: number
  queueId: number
  keluhanUtama: string | null
  diagnosa: string
  tindakan: string
  resepObat: string | null
  catatanTambahan: string | null
  dokterPenanggungJawab: string
  followUpDate: string | null
  createdAt: string
  updatedAt: string
  photos: { id: number; url: string; fileName: string }[]
}

interface EMRHistoryProps {
  patientId: number
}

export default function EMRHistory({ patientId }: EMRHistoryProps) {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])

  useEffect(() => {
    fetchHistory()
  }, [patientId])

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/patient/${patientId}/emr`)
      const data = await res.json()
      setVisits(data.data || [])
    } catch (error) {
      console.error(error)
      toast.error('Gagal memuat riwayat kunjungan')
    } finally {
      setLoading(false)
    }
  }

  const openLightbox = (photos: { url: string }[]) => {
    setLightboxImages(photos.map(p => p.url))
    setLightboxOpen(true)
  }

  return (
    <div className="space-y-4">
      {loading && <div className="text-center py-8">Memuat riwayat...</div>}
      {!loading && visits.length === 0 && (
        <div className="text-center py-8 text-gray-500">Belum ada riwayat kunjungan</div>
      )}
      {visits.map((visit) => (
        <Card key={visit.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="flex-1">
                <p className="font-bold text-lg">
                  {format(new Date(visit.createdAt), 'dd MMMM yyyy', { locale: id })}
                </p>
                <p className="text-sm text-gray-600">Diagnosa: {visit.diagnosa}</p>
                <p className="text-sm text-gray-600">Tindakan: {visit.tindakan}</p>
                <p className="text-sm text-gray-600">Dokter: {visit.dokterPenanggungJawab}</p>
                {visit.followUpDate && (
                  <p className="text-sm text-gray-600">
                    Follow Up: {format(new Date(visit.followUpDate), 'dd MMM yyyy')}
                  </p>
                )}
                {visit.photos.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {visit.photos.slice(0, 3).map((photo, idx) => (
                      <img
                        key={photo.id}
                        src={photo.url}
                        alt={photo.fileName}
                        className="w-10 h-10 object-cover rounded cursor-pointer border border-gray-200"
                        onClick={() => openLightbox(visit.photos)}
                      />
                    ))}
                    {visit.photos.length > 3 && (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                        +{visit.photos.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Link href={`/admin/emr/${patientId}/edit/${visit.id}`}>
                <Button size="sm">Edit</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxImages.map(src => ({ src }))}
      />
    </div>
  )
}
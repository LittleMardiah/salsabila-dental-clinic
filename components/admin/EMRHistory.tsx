// components/admin/EMRHistory.tsx - FIX: navigasi langsung dengan window.location.href
'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { toast } from 'sonner'

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

  // FIX: Navigasi langsung menggunakan window.location.href untuk memastikan berhasil di dalam modal
  const handleEditClick = (visitId: number) => {
    const targetUrl = `/admin/emr/${patientId}/edit/${visitId}`
    console.log('[EMRHistory] Navigasi ke:', targetUrl)
    // Gunakan window.location.href agar navigasi pasti terjadi, menghindari masalah modal/konteks
    window.location.href = targetUrl
  }

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-center py-12 text-on-surface-variant font-body">Memuat riwayat...</div>
      )}
      {!loading && visits.length === 0 && (
        <div className="text-center py-12 text-on-surface-variant/60 font-body">Belum ada riwayat kunjungan</div>
      )}
      {visits.map((visit) => (
        <div key={visit.id} className="diamond-glass rounded-3xl p-6 transition-all hover:shadow-xl hover:translate-y-[-2px] duration-300">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1 space-y-3">
              <p className="font-headline font-bold text-xl text-primary">
                {format(new Date(visit.createdAt), 'dd MMMM yyyy', { locale: id })}
              </p>
              <div className="space-y-1.5">
                <p className="text-sm font-body">
                  <span className="font-semibold text-on-surface/80">Diagnosa:</span>{' '}
                  <span className="text-on-surface/70">{visit.diagnosa}</span>
                </p>
                <p className="text-sm font-body">
                  <span className="font-semibold text-on-surface/80">Tindakan:</span>{' '}
                  <span className="text-on-surface/70">{visit.tindakan}</span>
                </p>
                <p className="text-sm font-body">
                  <span className="font-semibold text-on-surface/80">Dokter:</span>{' '}
                  <span className="text-on-surface/70">{visit.dokterPenanggungJawab}</span>
                </p>
                {visit.followUpDate && (
                  <p className="text-sm font-body">
                    <span className="font-semibold text-on-surface/80">Follow Up:</span>{' '}
                    <span className="text-on-surface/70">{format(new Date(visit.followUpDate), 'dd MMM yyyy')}</span>
                  </p>
                )}
              </div>
              {visit.photos.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {visit.photos.slice(0, 4).map((photo, idx) => (
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt={photo.fileName}
                      className="w-12 h-12 object-cover rounded-xl cursor-pointer border border-white/50 shadow-sm hover:scale-105 transition"
                      onClick={() => openLightbox(visit.photos)}
                    />
                  ))}
                  {visit.photos.length > 4 && (
                    <div className="w-12 h-12 bg-white/40 rounded-xl flex items-center justify-center text-xs font-bold text-on-surface-variant">
                      +{visit.photos.length - 4}
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button
              type="button"
              onClick={() => handleEditClick(visit.id)}
              className="rounded-full border border-primary/40 text-primary bg-white/50 hover:bg-white/80 shadow-sm transition-all px-5 py-1.5 text-sm font-label font-bold"
            >
              Edit
            </Button>
          </div>
        </div>
      ))}

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxImages.map(src => ({ src }))}
      />
    </div>
  )
}
// components/admin/EMRHistory.tsx - FIX: navigasi langsung dengan window.location.href
'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { ZoomIn } from 'lucide-react'
import PhotoLightbox, { type LightboxPhoto } from '@/components/admin/PhotoLightbox'
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
  const [viewer, setViewer] = useState<{ photos: LightboxPhoto[]; index: number } | null>(null)

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

  const openLightbox = (photos: { url: string; fileName?: string }[], index: number) => {
    const all = photos.map((photo, idx) => ({
      src: photo.url,
      name: photo.fileName || `Foto ${idx + 1}`,
    }))
    const list = all.filter((photo) => photo.src !== '')
    if (list.length === 0) {
      toast.warning('Tidak ada foto yang bisa ditampilkan')
      return
    }
    const selectedIndex = Math.max(
      0,
      list.findIndex((photo) => photo.src === all[index]?.src)
    )
    setViewer({ photos: list, index: selectedIndex })
  }

  // FIX: Navigasi langsung menggunakan window.location.href untuk memastikan berhasil di dalam modal
  const handleEditClick = (visitId: number) => {
    const targetUrl = `/admin/emr/${patientId}/edit/${visitId}`
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
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => openLightbox(visit.photos, idx)}
                      aria-label={`Perbesar ${photo.fileName || `Foto ${idx + 1}`}`}
                      className="group relative h-16 w-16 overflow-hidden rounded-xl border border-white/50 shadow-sm transition hover:scale-105 cursor-zoom-in"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.fileName}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition group-hover:opacity-100">
                        <ZoomIn className="h-4 w-4" />
                      </span>
                    </button>
                  ))}
                  {visit.photos.length > 4 && (
                    <button
                      type="button"
                      onClick={() => openLightbox(visit.photos, 4)}
                      className="h-16 w-16 rounded-xl bg-white/40 flex items-center justify-center text-xs font-bold text-on-surface-variant cursor-zoom-in"
                    >
                      +{visit.photos.length - 4}
                    </button>
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

      <PhotoLightbox
        open={!!viewer}
        photos={viewer?.photos || []}
        index={viewer?.index || 0}
        onIndexChange={(index) => setViewer((prev) => (prev ? { ...prev, index } : prev))}
        onClose={() => setViewer(null)}
      />
    </div>
  )
}
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, RefreshCw } from 'lucide-react'
import PhotoLightbox, { type LightboxPhoto } from '@/components/admin/PhotoLightbox'
import { useDarkMode } from '@/components/ui/sanctuary'
import FollowUpCard from '@/components/patient/FollowUpCard'
import ToothChart from '@/components/patient/ToothChart'
import { usePatientPortal } from '@/components/patient/PatientPortalProvider'
import { formatDateID } from '@/lib/ui-theme'
import type { PortalEmrResponse, PortalVisit } from '@/types/patient-portal'

type LightboxState = { photos: LightboxPhoto[]; index: number }

export default function PasienRekamMedisPage() {
  const router = useRouter()
  const { theme } = useDarkMode()
  const [data, setData] = useState<PortalEmrResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/portal/emr', { cache: 'no-store' })
      if (res.status === 401) {
        router.replace('/pasien/masuk')
        return
      }
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || 'Rekam medis belum dapat dimuat.')
        return
      }
      setData(body.data)
    } catch {
      setError('Koneksi terputus. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  const openPhotos = (visit: PortalVisit, index: number) => {
    setLightbox({
      photos: visit.photos.map((photo) => ({ src: photo.url, name: photo.name })),
      index,
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--pp-accent)]" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="px-6 py-16 text-center md:px-0 md:py-24">
        <p className="text-sm text-[var(--pp-secondary)]">{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            void load()
          }}
          className="pp-accent-btn mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Coba lagi
        </button>
      </div>
    )
  }

  const visits = data?.visits || []

  if (visits.length === 0) {
    return (
      <div className="px-6 py-10 md:px-0 md:py-16">
        <div className="pp-reveal flex flex-col items-center justify-center space-y-5 text-center">
          <div className="pp-card flex h-16 w-16 items-center justify-center rounded-full text-[var(--pp-accent)]">
            <FileText className="h-6 w-6" />
          </div>
          <div className="max-w-[280px] space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--pp-accent)]">
              Arsip Rekam Medis
            </p>
            <h1 className="font-editorial text-2xl font-semibold text-[var(--pp-text)]">
              Belum Ada Riwayat Berobat
            </h1>
            <p className="text-xs leading-relaxed text-[var(--pp-secondary)]">
              Peta odontogram, diagnosa, dan dokumentasi foto akan terisi otomatis setelah kunjungan pertama
              Anda di klinik. Data ini hanya dapat diisi oleh dokter atau admin.
            </p>
          </div>
          <Link
            href="/pasien/jadwal"
            className="pp-accent-btn rounded-2xl px-5 py-3 text-xs font-semibold"
          >
            Lihat Jadwal &amp; Antrean
          </Link>
          <p className="text-[10px] text-[var(--pp-muted)]">No. RM Anda menjadi kunci pencocokan di meja Admin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pp-reveal space-y-6 px-6 py-5 md:px-0 md:py-8 lg:space-y-8">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--pp-accent)]">
          Arsip Klinis Pasien
        </p>
        <h1 className="font-editorial text-[30px] font-semibold leading-none tracking-tight text-[var(--pp-text)] md:text-[40px]">
          Rekam Medis
        </h1>
        <p className="text-[11px] leading-relaxed text-[var(--pp-muted)]">
          Mode baca saja · {visits.length} kunjungan tercatat
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:items-start xl:gap-6">
        <div className="space-y-5 xl:sticky xl:top-8">
          <ToothChart visits={visits} />

          <section className="space-y-2.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pp-muted)]">
              Jadwal Kontrol Berikutnya
            </h2>
            <FollowUpCard control={data?.nextControl || null} compact />
          </section>
        </div>

      <section className="space-y-3 pb-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pp-muted)]">
          Riwayat Kunjungan ({visits.length})
        </h2>

        <div className="space-y-3">
          {visits.map((visit) => (
            <article key={visit.id} className="pp-card space-y-3 rounded-[24px] p-4">
              <div>
                <span className="font-mono-tech text-[10px] text-[var(--pp-accent)]">
                  {formatDateID(visit.queueDate || visit.createdAt)}
                  {visit.queueLabel ? ` • ${visit.queueLabel}` : ''}
                </span>
                <h3 className="mt-0.5 text-sm font-semibold text-[var(--pp-text)]">{visit.diagnosa}</h3>
                <p className="text-[11px] text-[var(--pp-secondary)]">
                  {visit.dokterPenanggungJawab} • Tindakan: {visit.tindakan}
                </p>
              </div>

              {visit.keluhanUtama ? (
                <div className="rounded-xl border border-[var(--pp-hairline)] bg-[var(--pp-soft)] px-3 py-2 text-[11px] leading-relaxed text-[var(--pp-secondary)]">
                  <span className="font-semibold text-[var(--pp-text)]">Keluhan:</span> {visit.keluhanUtama}
                </div>
              ) : null}

              {visit.catatanTambahan ? (
                <p className="text-xs leading-relaxed text-[var(--pp-secondary)]">{visit.catatanTambahan}</p>
              ) : null}

              <div className="rounded-xl border border-[var(--pp-hairline)] bg-[var(--pp-soft)] px-3 py-2 text-[11px] leading-relaxed text-[var(--pp-secondary)]">
                <span className="font-semibold text-[var(--pp-text)]">Resep / Catatan:</span>{' '}
                {visit.resepObat || 'Tidak ada resep obat pada kunjungan ini.'}
              </div>

              {visit.followUpDate ? (
                <p className="font-mono-tech text-[10px] text-[var(--pp-accent)]">
                  Kontrol: {formatDateID(visit.followUpDate)}
                  {visit.followUpTime ? ` • ${visit.followUpTime}` : ''}
                </p>
              ) : null}

              {visit.photos.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--pp-muted)]">
                    Dokumentasi Klinis &amp; X-Ray (Ketuk untuk Zoom)
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {visit.photos.map((photo, index) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => openPhotos(visit, index)}
                        className="tactile group relative h-24 overflow-hidden rounded-2xl border border-[var(--pp-hairline)] bg-[var(--pp-soft)] text-left"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2 text-[10px] font-medium leading-tight text-white">
                          {photo.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
      </div>

      <PhotoLightbox
        theme={theme}
        open={!!lightbox}
        photos={lightbox?.photos || []}
        index={lightbox?.index || 0}
        onIndexChange={(index) =>
          setLightbox((current) => (current ? { ...current, index } : current))
        }
        onClose={() => setLightbox(null)}
      />
    </div>
  )
}

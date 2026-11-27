'use client'

import { useState } from 'react'
import { Loader2, Plus, Stethoscope } from 'lucide-react'
import { usePatientPortal } from '@/components/patient/PatientPortalProvider'
import FollowUpCard from '@/components/patient/FollowUpCard'

const AFTERCARE = [
  {
    id: 'restorasi',
    category: 'Restorasi',
    title: 'Panduan Pasca Tambal Gigi',
    points: [
      'Hindari menggigit makanan keras atau lengket pada sisi tambalan selama 24 jam pertama.',
      'Kurangi konsumsi kopi, teh pekat, atau minuman berwarna dalam 12 jam awal.',
      'Sensasi ngilu ringan terhadap minuman dingin selama 2–3 hari pertama tergolong wajar.',
    ],
  },
  {
    id: 'scaling',
    category: 'Periodonti',
    title: 'Panduan Pasca Scaling Karang Gigi',
    points: [
      'Gunakan sikat gigi berbulu lembut dan sikat secara perlahan di area batas gusi.',
      'Berkumur dengan air garam hangat bila gusi terasa sedikit sensitif di hari pertama.',
      'Jadwalkan pembersihan karang gigi rutin setiap 6 bulan sekali.',
    ],
  },
  {
    id: 'bedah',
    category: 'Bedah Minor',
    title: 'Panduan Pasca Pencabutan Gigi',
    points: [
      'Gigit kasa steril selama 30–45 menit hingga perdarahan berhenti sepenuhnya.',
      'Hindari berkumur terlalu keras, meludah berulang, atau minum memakai sedotan selama 24 jam.',
      'Konsumsi makanan lunak bersuhu ruang serta obat sesuai resep dokter.',
    ],
  },
]

export default function PasienJadwalPage() {
  const { overview, loading, refresh, showNotice } = usePatientPortal()
  const [taking, setTaking] = useState(false)
  const [error, setError] = useState('')
  const [openGuide, setOpenGuide] = useState<string>('restorasi')

  const queue = overview?.activeQueue
  const clinicOpen = overview?.clinic.isOpen
  const patient = overview?.patient

  const takeQueue = async () => {
    setError('')
    setTaking(true)
    try {
      const res = await fetch('/api/portal/queue', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Antrean belum dapat diambil.')
        return
      }
      await refresh()
      showNotice(data.message || 'Antrean berhasil diambil')
    } catch {
      setError('Koneksi terputus. Silakan coba lagi.')
    } finally {
      setTaking(false)
    }
  }

  if (loading && !overview) {
    return (
      <div className="space-y-5 px-6 py-6 md:px-0 md:py-8 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0">
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--pp-soft)] lg:col-span-2" />
        <div className="h-56 animate-pulse rounded-2xl bg-[var(--pp-soft)]" />
        <div className="h-56 animate-pulse rounded-2xl bg-[var(--pp-soft)]" />
      </div>
    )
  }

  return (
    <div className="pp-reveal space-y-6 px-6 py-5 md:px-0 md:py-8 lg:space-y-8">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--pp-accent)]">
          Sinkronisasi Klinik
        </p>
        <h1 className="font-editorial text-[30px] font-semibold leading-none tracking-tight text-[var(--pp-text)] md:text-[40px]">
          Jadwal &amp; Antrean
        </h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <section className="pp-card space-y-4 rounded-[26px] p-5 md:p-6">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--pp-muted)]">
            Antrean Hari Ini
          </span>
          <span className="font-mono-tech text-[10px] text-[var(--pp-accent)]">
            {clinicOpen ? 'Real-Time' : 'Klinik Tutup'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-[var(--pp-secondary)]">Sedang Dilayani</p>
            <p className="mt-0.5 font-mono-tech text-3xl font-semibold text-[var(--pp-text)]">
              {clinicOpen ? overview?.servingLabel || '—' : 'Tutup'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[var(--pp-secondary)]">Nomor Anda</p>
            <p
              className={`mt-0.5 font-mono-tech text-3xl font-semibold ${
                queue ? 'text-[var(--pp-accent)]' : 'text-[var(--pp-muted)]'
              }`}
            >
              {queue ? queue.label : '—'}
            </p>
          </div>
        </div>

        {queue ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--pp-hairline)] bg-[var(--pp-soft)] p-3 text-[11px] text-[var(--pp-secondary)]">
            <span>
              Status: <strong className="text-[var(--pp-text)]">{queue.statusLabel}</strong>
            </span>
            <span className="font-mono-tech text-[10px]">
              {queue.status === 'CALLED' ? 'Silakan menuju ruang periksa' : `Posisi ${queue.position}`}
            </span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={takeQueue}
              disabled={taking || !clinicOpen}
              className="pp-accent-btn tactile inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {taking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {taking
                ? 'Mengambil antrean...'
                : clinicOpen
                  ? 'Ambil Nomor Antrean Hari Ini'
                  : 'Klinik Tutup · Antrean Dibuka Saat Buka'}
            </button>
            <p className="text-[10px] leading-relaxed text-[var(--pp-muted)]">
              Nomor yang Anda ambil langsung masuk ke daftar antrean Admin klinik. Tidak ada estimasi waktu
              tunggu; pantau nomor yang sedang dilayani.
            </p>
          </>
        )}

        {error ? (
          <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] font-medium text-rose-500">
            {error}
          </p>
        ) : null}
      </section>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pp-muted)]">
            Jadwal Kontrol Berikutnya
          </h2>
          <span className="text-[10px] font-medium text-[var(--pp-accent)]">Diatur Admin</span>
        </div>
        <FollowUpCard
          control={overview?.nextControl || null}
          patientName={patient?.name}
          noRm={patient?.noRm}
        />
      </section>
      </div>

      <section className="space-y-2.5 pb-2">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pp-muted)]">
          <Stethoscope className="h-3.5 w-3.5" />
          Panduan Perawatan Pasca-Tindakan
        </h2>
        <div className="grid gap-2 lg:grid-cols-3 lg:items-start">
          {AFTERCARE.map((guide) => {
            const isOpen = openGuide === guide.id
            return (
              <div key={guide.id} className="overflow-hidden rounded-2xl border border-[var(--pp-hairline)] bg-[var(--pp-elevated)]">
                <button
                  type="button"
                  onClick={() => setOpenGuide(isOpen ? '' : guide.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                >
                  <div>
                    <span className="font-mono-tech text-[9px] uppercase tracking-wider text-[var(--pp-accent)]">
                      {guide.category}
                    </span>
                    <p className="text-xs font-semibold text-[var(--pp-text)]">{guide.title}</p>
                  </div>
                  <span className="font-mono-tech text-sm text-[var(--pp-secondary)]">{isOpen ? '−' : '+'}</span>
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-1.5 border-t border-[var(--pp-hairline)] px-4 pb-3.5 pt-2 text-[11px] leading-relaxed text-[var(--pp-secondary)]">
                      {guide.points.map((point) => (
                        <p key={point}>• {point}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

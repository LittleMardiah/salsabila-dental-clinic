'use client'

import Link from 'next/link'
import { ArrowRight, CalendarDays, FileText } from 'lucide-react'
import { usePatientPortal } from '@/components/patient/PatientPortalProvider'
import FollowUpCard from '@/components/patient/FollowUpCard'
import { formatDateID } from '@/lib/ui-theme'

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[var(--pp-soft)] ${className}`} />
}

export default function PasienBerandaPage() {
  const { overview, loading } = usePatientPortal()

  if (loading && !overview) {
    return (
      <div className="space-y-5 px-6 py-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  const patient = overview?.patient
  const queue = overview?.activeQueue
  const clinicOpen = overview?.clinic.isOpen
  const firstName = patient?.name?.split(' ')[0] || 'Pasien'
  const latest = overview?.lastVisit

  return (
    <div className="pp-reveal space-y-6 px-6 py-5">
      <div className="space-y-1">
        <p className="font-mono-tech text-[10px] uppercase tracking-wider text-[var(--pp-muted)]">
          {patient?.noRm || 'No. RM belum diterbitkan'}
        </p>
        <h1 className="font-editorial text-[32px] font-semibold leading-[1.12] tracking-tight text-[var(--pp-text)]">
          Halo, <span className="font-normal italic text-[var(--pp-accent)]">{firstName}</span>
        </h1>
        <p className="text-xs leading-relaxed text-[var(--pp-secondary)]">
          {clinicOpen
            ? 'Klinik sedang buka hari ini. Pantau giliran antrean dan jadwal kontrol Anda.'
            : 'Klinik sedang tutup · Anda tetap dapat membuka rekam medis dan jadwal kontrol.'}
        </p>
      </div>

      <section className="pp-card space-y-4 rounded-[26px] p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--pp-muted)]">
            Status Antrean Aktif
          </span>
          <span className="text-[11px] font-medium text-[var(--pp-accent)]">
            {queue ? queue.statusLabel : 'Belum ada antrean'}
          </span>
        </div>

        <div className="grid grid-cols-2">
          <div className="border-r border-[var(--pp-hairline)] pr-4">
            <p className="text-[11px] text-[var(--pp-secondary)]">Nomor Anda</p>
            <p
              className={`mt-1 font-mono-tech text-3xl font-semibold tracking-tight ${
                queue ? 'text-[var(--pp-accent)]' : 'text-[var(--pp-muted)]'
              }`}
            >
              {queue ? queue.label : '—'}
            </p>
          </div>
          <div className="pl-5">
            <p className="text-[11px] text-[var(--pp-secondary)]">Sedang Dilayani</p>
            <p className="mt-1 font-mono-tech text-3xl font-semibold tracking-tight text-[var(--pp-text)]">
              {clinicOpen ? overview?.servingLabel || '—' : 'Tutup'}
            </p>
          </div>
        </div>

        {queue ? (
          <p className="text-[11px] leading-relaxed text-[var(--pp-secondary)]">
            {queue.status === 'CALLED'
              ? 'Giliran Anda saat ini. Silakan menuju ruang pemeriksaan.'
              : `Anda berada di posisi ke-${queue.position} dari ${queue.waitingCount} antrean yang menunggu.`}
          </p>
        ) : null}

        <div className="flex items-center justify-between border-t border-[var(--pp-hairline)] pt-3">
          <span className="text-[11px] text-[var(--pp-secondary)]">Sumber data: antrean klinik</span>
          <Link
            href="/pasien/jadwal"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--pp-accent)] hover:underline"
          >
            Lihat Antrean <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pp-muted)]">
            Jadwal Kontrol Berikutnya
          </h2>
          <span className="rounded-full border border-[var(--pp-hairline)] bg-[var(--pp-soft)] px-2.5 py-0.5 text-[10px] text-[var(--pp-secondary)]">
            Diatur Admin
          </span>
        </div>
        <FollowUpCard
          control={overview?.nextControl || null}
          patientName={patient?.name}
          noRm={patient?.noRm}
          compact
        />
      </section>

      <section className="space-y-2.5 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pp-muted)]">
            Ringkasan Kunjungan Terakhir
          </h2>
          <Link href="/pasien/rekam-medis" className="text-[11px] font-semibold text-[var(--pp-accent)] hover:underline">
            Rekam Medis
          </Link>
        </div>

        {latest ? (
          <Link
            href="/pasien/rekam-medis"
            className="pp-card tactile block space-y-1.5 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between text-[11px] text-[var(--pp-secondary)]">
              <span>{formatDateID(latest.date)}</span>
              <span className="font-mono-tech text-[var(--pp-accent)]">{latest.queueLabel || 'Kunjungan'}</span>
            </div>
            <p className="text-xs font-semibold text-[var(--pp-text)]">{latest.diagnosa}</p>
            <p className="line-clamp-2 text-[11px] leading-relaxed text-[var(--pp-secondary)]">
              {latest.tindakan} · {latest.dokter}
            </p>
          </Link>
        ) : (
          <div className="pp-card space-y-2 rounded-2xl p-4 text-xs leading-relaxed text-[var(--pp-secondary)]">
            <p className="flex items-center gap-2 font-medium text-[var(--pp-text)]">
              <FileText className="h-4 w-4 text-[var(--pp-accent)]" />
              Belum ada riwayat kunjungan
            </p>
            <p>
              Rekam medis akan otomatis terisi setelah pemeriksaan pertama Anda oleh dokter. Tidak perlu
              mengisi apa pun dari aplikasi.
            </p>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2.5 pb-2">
        <Link
          href="/pasien/rekam-medis"
          className="pp-card tactile flex items-center gap-2 rounded-2xl px-4 py-3 text-[11px] font-semibold text-[var(--pp-text)]"
        >
          <FileText className="h-4 w-4 text-[var(--pp-accent)]" />
          Rekam Medis
        </Link>
        <Link
          href="/pasien/jadwal"
          className="pp-card tactile flex items-center gap-2 rounded-2xl px-4 py-3 text-[11px] font-semibold text-[var(--pp-text)]"
        >
          <CalendarDays className="h-4 w-4 text-[var(--pp-accent)]" />
          Jadwal & Antrean
        </Link>
      </section>
    </div>
  )
}

'use client'

import { MessageCircle } from 'lucide-react'
import type { PortalNextControl } from '@/types/patient-portal'

const WA_BASE = 'https://wa.me/6281387530407'

function longDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

type FollowUpCardProps = {
  control: PortalNextControl | null
  patientName?: string | null
  noRm?: string | null
  compact?: boolean
}

/**
 * Read-only schedule from the Admin EMR. The only action is WhatsApp, matching
 * the clinic's confirmation flow; there is no fake in-app booking state.
 */
export default function FollowUpCard({ control, patientName, noRm, compact = false }: FollowUpCardProps) {
  const identity = `${patientName || 'pasien'}${noRm ? ` (${noRm})` : ''}`

  if (!control) {
    return (
      <div className="pp-card space-y-3.5 rounded-[26px] p-5">
        <p className="text-xs leading-relaxed text-[var(--pp-secondary)]">
          Belum ada jadwal kontrol berikutnya yang ditetapkan oleh Admin klinik untuk Anda.
        </p>
        <a
          href={`${WA_BASE}?text=${encodeURIComponent(
            `Halo Admin Salsa Dental, saya ${identity} ingin menanyakan rencana jadwal kontrol berikutnya.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tactile inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--pp-accent-soft)] px-4 py-2.5 text-xs font-semibold text-[var(--pp-accent)]"
        >
          <MessageCircle className="h-4 w-4" />
          Konfirmasi / Ubah via WA
        </a>
      </div>
    )
  }

  const dateLabel = longDate(control.date)
  const timeLabel = control.preferredTime || 'Jam dikonfirmasi oleh Admin'

  return (
    <div className="pp-card space-y-3.5 rounded-[26px] p-5">
      <div className="space-y-1">
        <p
          className={`font-editorial font-semibold leading-snug text-[var(--pp-text)] ${
            compact ? 'text-xl' : 'text-2xl'
          }`}
        >
          {dateLabel}
        </p>
        <p className="font-mono-tech text-xs text-[var(--pp-accent)]">
          {timeLabel}
          {control.doctor ? ` • ${control.doctor}` : ''}
        </p>
      </div>

      <p className="text-xs leading-relaxed text-[var(--pp-secondary)]">
        {control.procedure ||
          control.note ||
          'Jadwal kontrol ditetapkan oleh dokter penanggung jawab Anda.'}
      </p>

      <a
        href={`${WA_BASE}?text=${encodeURIComponent(
          `Halo Admin Salsa Dental, saya ${identity} ingin konfirmasi atau penyesuaian jadwal kontrol pada ${dateLabel}${
            control.preferredTime ? ` pukul ${control.preferredTime}` : ''
          }.`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="pp-accent-btn tactile inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold"
      >
        <MessageCircle className="h-4 w-4" />
        Konfirmasi / Ubah via WA
      </a>

      <p className="border-t border-[var(--pp-hairline)] pt-2 text-[11px] leading-relaxed text-[var(--pp-muted)]">
        Jika tidak melakukan konfirmasi atau perubahan melalui WhatsApp, jadwal dianggap sesuai rencana awal
        dokter.
      </p>
    </div>
  )
}

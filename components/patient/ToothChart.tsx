'use client'

import { useMemo, useState } from 'react'
import type { PortalVisit } from '@/types/patient-portal'

const UPPER = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28']
const LOWER = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38']

const POSITION_LABEL: Record<string, string> = {
  '1': 'Insisivus Sentral',
  '2': 'Insisivus Lateral',
  '3': 'Kaninus',
  '4': 'Premolar Pertama',
  '5': 'Premolar Kedua',
  '6': 'Molar Pertama',
  '7': 'Molar Kedua',
  '8': 'Molar Ketiga',
}

const QUADRANT_LABEL: Record<string, string> = {
  '1': 'Kanan Atas',
  '2': 'Kiri Atas',
  '3': 'Kiri Bawah',
  '4': 'Kanan Bawah',
}

function toothName(code: string) {
  return `${POSITION_LABEL[code[1]] || 'Gigi'} ${QUADRANT_LABEL[code[0]] || ''}`.trim()
}

function shortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

type MarkedTooth = {
  label: string
  color: string
  visit: PortalVisit
}

/**
 * Read-only FDI 32-tooth chart. Selecting a tooth only updates local state, so
 * the detail panel changes in place without refetching or flickering.
 */
export default function ToothChart({ visits }: { visits: PortalVisit[] }) {
  const merged = useMemo(() => {
    const map = new Map<string, MarkedTooth>()
    for (const visit of visits) {
      const odontogram = visit.odontogram
      if (!odontogram) continue
      for (const [code, mark] of Object.entries(odontogram.marks)) {
        if (!map.has(code)) {
          map.set(code, { label: mark.label, color: mark.color, visit })
        }
      }
    }
    return map
  }, [visits])

  const [selected, setSelected] = useState<string>(() => {
    const first = merged.keys().next()
    return first.done ? '11' : first.value
  })
  const active = merged.get(selected)

  const renderTooth = (code: string) => {
    const isSelected = selected === code
    const mark = merged.get(code)
    return (
      <button
        key={code}
        type="button"
        onClick={() => setSelected(code)}
        aria-pressed={isSelected}
        aria-label={`Gigi ${code} — ${toothName(code)}${mark ? `, ${mark.label}` : ', sehat'}`}
        className={`tactile flex h-8 flex-col items-center justify-center rounded-lg font-mono-tech text-[10px] transition-colors duration-200 ${
          isSelected
            ? 'bg-[var(--pp-accent)] font-semibold text-[var(--pp-accent-ink)] shadow-sm'
            : mark
              ? 'border border-[var(--pp-hairline)] bg-[var(--pp-elevated)] font-medium text-[var(--pp-text)]'
              : 'bg-[var(--pp-soft)] font-medium text-[var(--pp-secondary)] hover:opacity-85'
        }`}
      >
        <span>{code}</span>
        {mark ? (
          <span
            className="mt-0.5 h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: isSelected ? 'currentColor' : mark.color }}
          />
        ) : null}
      </button>
    )
  }

  return (
    <section className="pp-card space-y-3.5 rounded-[26px] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--pp-text)]">Odontogram FDI (32 Gigi)</span>
        <span className="text-[10px] text-[var(--pp-muted)]">Ketuk nomor gigi</span>
      </div>

      <div className="space-y-1.5">
        <p className="text-[9px] uppercase tracking-widest text-[var(--pp-muted)]">Rahang Atas (18–11 | 21–28)</p>
        <div className="grid grid-cols-8 gap-1">{UPPER.map(renderTooth)}</div>
        <p className="pt-1 text-[9px] uppercase tracking-widest text-[var(--pp-muted)]">
          Rahang Bawah (48–41 | 31–38)
        </p>
        <div className="grid grid-cols-8 gap-1">{LOWER.map(renderTooth)}</div>
      </div>

      <div className="min-h-[74px] rounded-2xl border border-[var(--pp-hairline)] bg-[var(--pp-soft)] p-3.5 transition-opacity duration-200">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold text-[var(--pp-text)]">
            Gigi #{selected} • {toothName(selected)}
          </span>
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
            style={
              active
                ? { backgroundColor: `${active.color}26`, color: active.color }
                : { backgroundColor: 'rgba(16,185,129,0.14)', color: '#059669' }
            }
          >
            {active ? active.label : 'Sehat'}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--pp-secondary)]">
          {active
            ? `${active.visit.diagnosa} — ${active.visit.tindakan} (${shortDate(active.visit.createdAt)}). Catatan dokter tersimpan pada riwayat kunjungan di bawah.`
            : 'Tidak ditemukan karies maupun riwayat tindakan klinis pada gigi ini.'}
        </p>
      </div>

      {merged.size > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {Array.from(new Map(Array.from(merged.values()).map((item) => [item.label, item])).values()).map(
            (item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pp-hairline)] px-2 py-0.5 text-[9px] text-[var(--pp-secondary)]"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            )
          )}
        </div>
      ) : null}
    </section>
  )
}

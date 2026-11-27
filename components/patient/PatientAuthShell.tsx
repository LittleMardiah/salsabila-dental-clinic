'use client'

import Link from 'next/link'
import { ArrowLeft, CalendarDays, FileText, ShieldCheck } from 'lucide-react'
import { PatientBrand, PatientThemeButton } from '@/components/patient/PatientBrand'

type PatientAuthShellProps = {
  eyebrow: string
  title: string
  subtitle: string
  backHref?: string
  backLabel?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

const HIGHLIGHTS = [
  {
    icon: FileText,
    text: 'Rekam medis read-only dengan peta gigi FDI 32 gigi.',
  },
  {
    icon: CalendarDays,
    text: 'Antrean dan jadwal kontrol tersinkron dari dashboard Admin.',
  },
  {
    icon: ShieldCheck,
    text: 'Sesi pasien terpisah dari akun Admin dan data keuangan klinik.',
  },
]

export default function PatientAuthShell({ eyebrow, title, subtitle, backHref, backLabel = 'Kembali', children, footer }: PatientAuthShellProps) {
  return (
    <div className="patient-portal min-h-[100dvh] w-full">
      <div
        className="mx-auto flex min-h-[100dvh] w-full max-w-[1200px] flex-col px-5 sm:px-8 lg:flex-row lg:gap-16 lg:px-10"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.9rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
        }}
      >
        <aside className="hidden lg:flex lg:w-[44%] lg:shrink-0 lg:flex-col lg:justify-between lg:py-8">
          <PatientBrand href="/pasien/masuk" />

          <div className="pp-reveal space-y-6">
            <div className="h-[1.5px] w-12 bg-[var(--pp-accent)]" />
            <div className="space-y-3">
              <p className="font-mono-tech text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--pp-accent)]">Ruang Pasien Salsa Dental</p>
              <h2 className="font-editorial text-[40px] font-semibold leading-[1.08] tracking-tight text-[var(--pp-text)]">
                Ketenangan dalam setiap <span className="font-normal italic text-[var(--pp-accent)]">kunjungan.</span>
              </h2>
              <p className="max-w-[380px] text-xs leading-relaxed text-[var(--pp-secondary)]">
                Pantau antrean, buka riwayat perawatan, dan siapkan kontrol berikutnya — tanpa perlu menghubungi klinik untuk hal yang bisa Anda lihat sendiri.
              </p>
            </div>

            <ul className="max-w-[400px] space-y-3 border-t border-[var(--pp-hairline)] pt-5">
              {HIGHLIGHTS.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.text} className="flex items-start gap-3 text-[11px] leading-relaxed text-[var(--pp-secondary)]">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--pp-accent-soft)] text-[var(--pp-accent)]">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {item.text}
                  </li>
                )
              })}
            </ul>
          </div>

          <p className="text-[10px] leading-relaxed text-[var(--pp-muted)]">Salsabila Dental Clinic · Portal Pasien PWA</p>
        </aside>

        <div className="flex min-h-[calc(100dvh-4rem)] w-full flex-col lg:min-h-0 lg:flex-1 lg:py-8">
          <div className="flex items-center justify-between gap-3 pb-5 lg:pb-6">
            {backHref ? (
              <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--pp-secondary)] transition-colors hover:text-[var(--pp-text)]">
                <ArrowLeft className="h-3.5 w-3.5" />
                {backLabel}
              </Link>
            ) : (
              <PatientBrand href="/pasien/masuk" />
            )}
            <PatientThemeButton />
          </div>

          <div className="w-full lg:my-auto">
            <div className="pp-reveal w-full max-w-lg lg:mx-0 lg:max-w-[452px] lg:rounded-[30px] lg:border lg:border-[var(--pp-hairline)] lg:bg-[var(--pp-elevated)] lg:p-8 lg:shadow-[var(--pp-shadow)]">
              <div className="mb-5 space-y-1.5 lg:mb-6">
                <p className="font-mono-tech text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--pp-accent)]">{eyebrow}</p>
                <h1 className="font-editorial text-[32px] font-semibold leading-tight tracking-tight text-[var(--pp-text)] lg:text-[34px]">{title}</h1>
                <p className="text-xs leading-relaxed text-[var(--pp-secondary)]">{subtitle}</p>
              </div>
              {children}
            </div>

            {footer ? <div className="w-full max-w-lg pt-6 text-center lg:max-w-[452px] lg:pt-7">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

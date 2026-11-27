'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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

export default function PatientAuthShell({
  eyebrow,
  title,
  subtitle,
  backHref,
  backLabel = 'Kembali',
  children,
  footer,
}: PatientAuthShellProps) {
  return (
    <div className="patient-portal min-h-[100dvh] w-full">
      <div
        className="patient-portal-shell flex min-h-[100dvh] flex-col px-6 pb-8"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.9rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
        }}
      >
        <div className="flex items-center justify-between gap-3 pb-5">
          {backHref ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--pp-secondary)] transition-colors hover:text-[var(--pp-text)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </Link>
          ) : (
            <PatientBrand href="/pasien/masuk" />
          )}
          <PatientThemeButton />
        </div>

        <div className="pp-reveal flex-1">
          <div className="mb-5 space-y-1.5">
            <p className="font-mono-tech text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--pp-accent)]">
              {eyebrow}
            </p>
            <h1 className="font-editorial text-3xl font-semibold leading-tight tracking-tight text-[var(--pp-text)]">
              {title}
            </h1>
            <p className="text-xs leading-relaxed text-[var(--pp-secondary)]">{subtitle}</p>
          </div>
          {children}
        </div>

        {footer ? <div className="pt-7 text-center">{footer}</div> : null}
      </div>
    </div>
  )
}

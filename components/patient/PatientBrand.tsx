'use client'

import Link from 'next/link'
import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from '@/components/ui/sanctuary'

/** Brand wordmark without the dot, accent-colored in both themes. */
export function PatientBrand({ href = '/pasien/beranda' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex min-w-0 items-center" aria-label="Salsa Dental">
      <span className="font-editorial text-[24px] font-semibold leading-none tracking-tight text-[var(--pp-accent)]">
        Salsa <span className="font-normal italic">Dental</span>
      </span>
    </Link>
  )
}

/** Icon-only theme toggle (Bulan / Matahari), no text label. */
export function PatientThemeButton({ className = '' }: { className?: string }) {
  const { darkMode, toggle } = useDarkMode()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={darkMode ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
      className={`tactile inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--pp-hairline)] bg-[var(--pp-elevated)] text-[var(--pp-text)] transition-colors hover:border-[var(--pp-accent)] ${className}`}
    >
      {darkMode ? (
        <Sun className="h-4 w-4 text-[var(--pp-accent)]" />
      ) : (
        <Moon className="h-4 w-4 text-[var(--pp-accent-strong)]" />
      )}
    </button>
  )
}

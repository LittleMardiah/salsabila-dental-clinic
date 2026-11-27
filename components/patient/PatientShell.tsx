'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, FileText, Home, User } from 'lucide-react'
import PatientPortalProvider, { usePatientPortal } from '@/components/patient/PatientPortalProvider'
import { PatientBrand, PatientThemeButton } from '@/components/patient/PatientBrand'

const NAV_ITEMS = [
  { href: '/pasien/beranda', label: 'Beranda', icon: Home },
  { href: '/pasien/rekam-medis', label: 'Rekam Medis', icon: FileText },
  { href: '/pasien/jadwal', label: 'Jadwal', icon: CalendarDays },
  { href: '/pasien/profil', label: 'Profil', icon: User },
]

function ClinicStatus({ className = '' }: { className?: string }) {
  const { overview } = usePatientPortal()
  const isOpen = overview?.clinic.isOpen

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--pp-hairline)] px-2.5 py-1 text-[10px] font-semibold tracking-wide ${
        isOpen === undefined
          ? 'bg-[var(--pp-soft)] text-[var(--pp-muted)]'
          : isOpen
          ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
          : 'bg-[var(--pp-accent-soft)] text-[var(--pp-accent)]'
      } ${className}`}
      title="Status klinik tersinkron dari Admin"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isOpen === undefined ? 'bg-[var(--pp-muted)]' : isOpen ? 'bg-emerald-500' : 'bg-[var(--pp-accent)]'}`} />
      {isOpen === undefined ? 'Memuat' : isOpen ? 'Klinik Buka' : 'Klinik Tutup'}
    </span>
  )
}

function PortalHeader() {
  return (
    <header className="pp-glass sticky top-0 z-30 border-b border-[var(--pp-hairline)] md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center justify-between gap-2 px-5 py-2.5">
        <PatientBrand />
        <div className="flex shrink-0 items-center gap-2">
          <ClinicStatus />
          <PatientThemeButton />
        </div>
      </div>
    </header>
  )
}

function PortalSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:w-[236px] md:shrink-0 md:flex-col md:py-8 lg:w-[264px]">
      <div className="sticky top-8 flex max-h-[calc(100dvh-4rem)] flex-col gap-8">
        <div className="space-y-1.5">
          <PatientBrand />
          <p className="font-mono-tech text-[9px] uppercase tracking-[0.22em] text-[var(--pp-muted)]">Portal Pasien</p>
        </div>

        <nav aria-label="Navigasi pasien" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`tactile group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[12px] transition-colors duration-300 ${
                  active
                    ? 'border border-[var(--pp-hairline)] bg-[var(--pp-elevated)] font-semibold text-[var(--pp-text)] shadow-[var(--pp-shadow)]'
                    : 'font-medium text-[var(--pp-secondary)] hover:bg-[var(--pp-soft)] hover:text-[var(--pp-text)]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-[var(--pp-accent)] transition-all duration-300 ${
                    active ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
                  }`}
                />
                <Icon className={`h-[18px] w-[18px] ${active ? 'text-[var(--pp-accent)]' : 'text-[var(--pp-muted)]'}`} strokeWidth={1.6} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="rounded-2xl border border-[var(--pp-hairline)] bg-[var(--pp-elevated)] p-3.5 shadow-[var(--pp-shadow)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--pp-muted)]">Status Klinik</p>
            <div className="mt-2">
              <ClinicStatus />
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--pp-muted)]">Tersinkron otomatis dengan dashboard Admin.</p>
          </div>
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] font-medium text-[var(--pp-secondary)]">Tema tampilan</span>
            <PatientThemeButton />
          </div>
        </div>
      </div>
    </aside>
  )
}

function PortalBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigasi pasien"
      className="pp-glass pp-nav-safe fixed bottom-0 left-1/2 z-40 w-full max-w-[520px] -translate-x-1/2 border-t border-[var(--pp-hairline)] px-2 pt-1 md:hidden"
    >
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`tactile relative flex flex-col items-center justify-center gap-1 py-2 transition-colors duration-300 ${
                active ? 'text-[var(--pp-accent)]' : 'text-[var(--pp-muted)] hover:text-[var(--pp-text)]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute -top-1 h-[2px] w-8 rounded-full bg-[var(--pp-accent)] transition-all duration-300 ${
                  active ? 'scale-x-100 opacity-100' : 'scale-x-50 opacity-0'
                }`}
              />
              <Icon className="h-[19px] w-[19px]" strokeWidth={1.6} />
              <span className={`text-[10px] tracking-[0.02em] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default function PatientShell({ children }: { children: React.ReactNode }) {
  return (
    <PatientPortalProvider>
      <div className="patient-portal min-h-[100dvh] w-full">
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1320px] flex-col md:flex-row md:gap-8 md:px-6 lg:gap-12 lg:px-10">
          <PortalSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <PortalHeader />
            <main className="flex-1 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] md:pb-12">{children}</main>
          </div>
        </div>
        <PortalBottomNav />
      </div>
    </PatientPortalProvider>
  )
}

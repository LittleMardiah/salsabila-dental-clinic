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

function PortalHeader() {
  const { overview } = usePatientPortal()
  const isOpen = overview?.clinic.isOpen

  return (
    <header
      className="pp-glass sticky top-0 z-30 border-b border-[var(--pp-hairline)]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center justify-between gap-2 px-5 py-2.5">
        <PatientBrand />
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--pp-hairline)] px-2.5 py-1 text-[10px] font-semibold tracking-wide ${
              isOpen === undefined
                ? 'bg-[var(--pp-soft)] text-[var(--pp-muted)]'
                : isOpen
                  ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                  : 'bg-[var(--pp-accent-soft)] text-[var(--pp-accent)]'
            }`}
            title="Status klinik tersinkron dari Admin"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isOpen === undefined ? 'bg-[var(--pp-muted)]' : isOpen ? 'bg-emerald-500' : 'bg-[var(--pp-accent)]'
              }`}
            />
            {isOpen === undefined ? 'Memuat' : isOpen ? 'Buka' : 'Tutup'}
          </span>
          <PatientThemeButton />
        </div>
      </div>
    </header>
  )
}

function PortalBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigasi pasien"
      className="pp-glass pp-nav-safe fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-[var(--pp-hairline)] px-2 pt-1"
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
                className={`absolute -top-1 h-[2px] w-8 rounded-full bg-[var(--pp-accent)] transition-all duration-300 ${
                  active ? 'scale-x-100 opacity-100' : 'scale-x-50 opacity-0'
                }`}
              />
              <Icon className="h-[19px] w-[19px]" strokeWidth={1.6} />
              <span className={`text-[10px] tracking-[0.02em] ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
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
        <div className="patient-portal-shell flex min-h-[100dvh] flex-col">
          <PortalHeader />
          <main className="flex-1 pb-28">{children}</main>
          <PortalBottomNav />
        </div>
      </div>
    </PatientPortalProvider>
  )
}

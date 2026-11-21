'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Plus } from 'lucide-react'
import {
  FAQ_ITEMS,
} from '@/lib/ui-theme'
import {
  useDarkMode,
  SanctuaryBrand,
  SanctuaryShimmerSpan,
  SmoothFaqBody,
  MagneticSanctuaryButton,
  ThemeToggle,
  WhatsAppHelpFab,
} from '@/components/ui/sanctuary'

type PublicStatus = {
  isOpen: boolean
  servingNumber: string | null
  waitingCount: number
  totalToday: number
}

export default function Home() {
  const router = useRouter()
  const { darkMode, theme } = useDarkMode()
  const [openFaqNum, setOpenFaqNum] = useState<string | null>('01')
  const [silkOffset, setSilkOffset] = useState({ x: 0, y: 0 })
  const [waOpen, setWaOpen] = useState(false)
  const [status, setStatus] = useState<PublicStatus>({
    isOpen: true,
    servingNumber: null,
    waitingCount: 0,
    totalToday: 0,
  })
  const [statusLoaded, setStatusLoaded] = useState(false)

  useEffect(() => {
    let active = true

    const loadStatus = async () => {
      try {
        const res = await fetch('/api/queue/public', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (active && data.success) {
          setStatus({
            isOpen: data.isOpen !== false,
            servingNumber: data.servingNumber,
            waitingCount: data.waitingCount || 0,
            totalToday: data.totalToday || 0,
          })
        }
      } catch {
        // Keep the last known status; the landing page stays usable offline.
      } finally {
        if (active) setStatusLoaded(true)
      }
    }

    loadStatus()
    const interval = setInterval(loadStatus, 15000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return (
    <div
      className={`min-h-screen w-full max-w-full ${theme.bg} ${theme.text} font-sans-clean relative overflow-x-hidden transition-colors duration-700 selection:bg-[#D08080]/25 flex flex-col`}
    >
      {/* Subtle tactile paper grain */}
      <div
        aria-hidden="true"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.032'/%3E%3C/svg%3E\")",
        }}
        className="pointer-events-none fixed inset-0 z-0"
      />

      <header className="relative z-30 w-full shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          <SanctuaryBrand href="/" />

          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0">
            <ThemeToggle theme={theme} />
            <Link
              href="/admin/login"
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border text-[11px] sm:text-xs font-normal tracking-[0.02em] transition-all duration-300 hover:border-[#D08080] cursor-pointer shrink-0 whitespace-nowrap ${theme.pillSurface}`}
            >
              <Lock className="w-3.5 h-3.5 text-[#D08080] shrink-0" />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col">
        {/* HERO */}
        <section
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const nx = (e.clientX - rect.left) / rect.width - 0.5
            const ny = (e.clientY - rect.top) / rect.height - 0.5
            setSilkOffset({ x: nx * 24, y: ny * 18 })
          }}
          className="relative pt-10 sm:pt-16 lg:pt-20 pb-16 sm:pb-24 lg:pb-28 text-center"
        >
          <div
            aria-hidden="true"
            style={{ transform: `translate3d(${silkOffset.x}px, ${silkOffset.y}px, 0)` }}
            className="pointer-events-none absolute inset-0 overflow-hidden transition-transform duration-700 ease-out"
          >
            <div
              style={{
                animation: 'silkAuroraBreath 16s ease-in-out infinite',
                background: darkMode
                  ? 'radial-gradient(ellipse 52% 46% at 50% 45%, rgba(208,128,128,0.25), rgba(139,79,79,0.08) 56%, transparent 78%)'
                  : 'radial-gradient(ellipse 52% 46% at 50% 45%, rgba(243,222,222,0.95), rgba(208,128,128,0.22) 54%, transparent 78%)',
              }}
              className="absolute -inset-16 blur-2xl"
            />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2.5 sm:gap-3">
              <span className="w-5 sm:w-6 h-[1px] bg-[#D08080]/70" />
              <span className={`font-mono-tech text-[10px] sm:text-[11px] uppercase tracking-[0.22em] ${theme.roseLabel}`}>
                01 / SALSABILA DENTAL CLINIC
              </span>
              <span className="w-5 sm:w-6 h-[1px] bg-[#D08080]/70" />
            </div>

            <h1 className="mt-6 sm:mt-7 font-editorial text-4xl sm:text-6xl md:text-7xl lg:text-[82px] font-normal leading-[1.05] tracking-[-0.02em]">
              The <SanctuaryShimmerSpan darkMode={darkMode}>Clinical Sanctuary</SanctuaryShimmerSpan>{' '}
              Experience.
            </h1>

            <p className={`mt-5 sm:mt-7 max-w-xl mx-auto text-xs sm:text-sm md:text-base font-light leading-[1.85] ${theme.textMuted}`}>
              Standar baru perawatan gigi profesional dalam ketenangan ruang galeri—memadukan
              presisi klinis drg. Salsabila dengan suasana lembut bernuansa Dusty Rose.
            </p>

            <div className="mt-9 sm:mt-11 flex justify-center">
              <MagneticSanctuaryButton
                darkMode={darkMode}
                onClick={() => router.push('/patient/login')}
              >
                Ambil Antrian Sekarang
              </MagneticSanctuaryButton>
            </div>
          </div>
        </section>

        {/* LIVE CLINIC STATUS — hairline strip, NO wait-time estimate */}
        <section className={`border-y ${theme.hairline}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              <div className="lg:col-span-4 flex items-center justify-between lg:justify-start gap-4">
                <div className="flex items-center gap-3.5">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    {status.isOpen && (
                      <span
                        style={{ animation: 'pulseBeaconRing 2.4s infinite' }}
                        className="absolute inline-flex h-full w-full rounded-full bg-emerald-500"
                      />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        status.isOpen ? 'bg-emerald-500' : 'bg-[#D08080]'
                      }`}
                    />
                  </span>
                  <div>
                    <span className={`block font-mono-tech text-[10px] uppercase tracking-[0.2em] ${theme.textSubtle}`}>
                      STATUS KLINIK HARI INI
                    </span>
                    <span className="mt-0.5 block text-sm sm:text-base font-medium transition-colors duration-300">
                      {status.isOpen ? 'Klinik Buka' : 'Klinik Tutup'}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`lg:col-span-8 pt-6 lg:pt-0 border-t lg:border-t-0 lg:border-l ${theme.hairline} lg:pl-10 grid grid-cols-3 gap-3 sm:gap-8`}
              >
                <div className="group transition-transform duration-300 hover:-translate-y-0.5 min-w-0">
                  <span className="inline-flex items-center gap-1.5 font-mono-tech text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-[#D08080]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D08080] animate-pulse shrink-0" />
                    <span>SEDANG DILAYANI</span>
                  </span>
                  <div className={`mt-1.5 font-editorial italic text-2xl sm:text-4xl lg:text-5xl leading-none tabular-nums transition-all duration-300 ${theme.roseAccent}`}>
                    {status.servingNumber || '—'}
                  </div>
                </div>

                <div className="group transition-transform duration-300 hover:-translate-y-0.5 min-w-0">
                  <span className={`block font-mono-tech text-[9px] sm:text-[10px] uppercase tracking-[0.16em] ${theme.textSubtle}`}>
                    ANTREAN MENUNGGU
                  </span>
                  <div className="mt-1.5 font-editorial italic text-2xl sm:text-4xl lg:text-5xl leading-none tabular-nums transition-all duration-300">
                    {String(status.waitingCount).padStart(2, '0')}
                  </div>
                </div>

                <div className="group transition-transform duration-300 hover:-translate-y-0.5 min-w-0">
                  <span className={`block font-mono-tech text-[9px] sm:text-[10px] uppercase tracking-[0.16em] ${theme.textSubtle}`}>
                    TOTAL HARI INI
                  </span>
                  <div className="mt-1.5 font-editorial italic text-2xl sm:text-4xl lg:text-5xl leading-none tabular-nums transition-all duration-300">
                    {String(status.totalToday).padStart(2, '0')}
                  </div>
                </div>
              </div>
            </div>

            {statusLoaded && (
              <p className={`mt-5 lg:mt-4 text-[10px] font-mono-tech uppercase tracking-[0.14em] ${theme.textSubtle}`}>
                Diperbarui otomatis dari papan antrean klinik
              </p>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-12 space-y-4">
              <div className="inline-flex items-center gap-3">
                <span className="w-6 h-[1px] bg-[#D08080]/70" />
                <span className={`font-mono-tech text-[11px] uppercase tracking-[0.22em] ${theme.roseLabel}`}>
                  02 / PERTANYAAN UMUM
                </span>
              </div>
              <h2 className="font-editorial text-3xl sm:text-4xl font-normal leading-[1.15]">
                Informasi <SanctuaryShimmerSpan darkMode={darkMode}>Kunjungan</SanctuaryShimmerSpan>{' '}
                Pasien.
              </h2>
              <p className={`text-xs sm:text-sm font-light leading-[1.8] ${theme.textMuted}`}>
                Semua yang perlu Anda ketahui mengenai alur kode antrean dan kenyamanan
                perawatan di klinik.
              </p>
            </div>

            <div className={`lg:col-span-8 border-t ${theme.hairline} divide-y ${theme.divideHairline}`}>
              {FAQ_ITEMS.map((item) => {
                const isOpen = openFaqNum === item.num
                return (
                  <div key={item.num} className="py-5 sm:py-7">
                    <button
                      type="button"
                      onClick={() => setOpenFaqNum(isOpen ? null : item.num)}
                      aria-expanded={isOpen}
                      className="w-full flex items-start justify-between gap-4 sm:gap-6 text-left group cursor-pointer"
                    >
                      <div className="flex items-baseline gap-4 sm:gap-7 min-w-0">
                        <span
                          className={`font-mono-tech text-xs transition-colors duration-300 shrink-0 ${
                            isOpen ? 'text-[#D08080]' : theme.roseLabel
                          }`}
                        >
                          {item.num}
                        </span>
                        <span className="text-sm sm:text-base md:text-lg font-normal leading-snug group-hover:text-[#D08080] transition-colors duration-300">
                          {item.question}
                        </span>
                      </div>
                      <Plus
                        className={`w-4 h-4 mt-1.5 shrink-0 text-[#D08080] transition-transform duration-300 ease-out ${
                          isOpen ? 'rotate-45' : ''
                        }`}
                      />
                    </button>

                    <SmoothFaqBody isOpen={isOpen} textClass={theme.textMuted}>
                      {item.answer}
                    </SmoothFaqBody>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <footer className={`mt-auto border-t ${theme.hairline}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-light">
            <div className={theme.textSubtle}>
              © 2026 Salsabila Dental Clinic. The Clinical Sanctuary Experience.
            </div>
            <div className={`font-mono-tech text-[10px] uppercase tracking-[0.2em] ${theme.textSubtle}`}>
              ARCHITECTURAL HAIRLINE FOLIO
            </div>
          </div>
        </footer>
      </main>

      <WhatsAppHelpFab theme={theme} open={waOpen} setOpen={setWaOpen} />
    </div>
  )
}

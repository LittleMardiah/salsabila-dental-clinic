'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PatientBrand, PatientThemeButton } from '@/components/patient/PatientBrand'

const MIN_SPLASH_MS = 1500

export default function PasienSplashPage() {
  const router = useRouter()
  const [target, setTarget] = useState('/pasien/masuk')

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/patient-sw.js').catch(() => {
        // Optional enhancement only.
      })
    }

    let active = true
    const startedAt = Date.now()

    const boot = async () => {
      let target = '/pasien/masuk'
      try {
        const res = await fetch('/api/portal/auth/session', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data?.authenticated) target = '/pasien/beranda'
        }
      } catch {
        target = '/pasien/masuk'
      }

      const remaining = Math.max(0, MIN_SPLASH_MS - (Date.now() - startedAt))
      await new Promise((resolve) => setTimeout(resolve, remaining))
      if (!active) return
      setTarget(target)
      router.replace(target)
    }

    void boot()
    return () => {
      active = false
    }
  }, [router])

  return (
    <div className="patient-portal flex min-h-[100dvh] w-full flex-col">
      <div
        className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 sm:px-8 lg:px-10"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
        }}
      >
        <div className="flex justify-end">
          <PatientThemeButton />
        </div>

        <div className="my-auto grid w-full gap-10 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16">
          <div className="pp-reveal space-y-5 lg:space-y-6">
            <div className="h-[1.5px] w-10 bg-[var(--pp-accent)]" />
            <div className="space-y-2">
              <p className="font-mono-tech text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--pp-accent)]">
                Patient Portal PWA
              </p>
              <PatientBrand href="/pasien" />
            </div>
            <p className="max-w-[360px] text-xs leading-relaxed text-[var(--pp-secondary)] lg:text-sm">
              Ruang digital yang tenang untuk memantau antrean klinik, rekam medis gigi, dan jadwal kontrol
              Anda.
            </p>
          </div>

          <div className="space-y-4 rounded-[26px] border border-[var(--pp-hairline)] bg-[var(--pp-elevated)] p-5 shadow-[var(--pp-shadow)] lg:p-7">
            <div className="h-[2px] w-full overflow-hidden rounded-full bg-[var(--pp-soft)]">
              <div className="pp-splash-bar h-full w-2/3 rounded-full bg-[var(--pp-accent)]" />
            </div>
            <button
              type="button"
              onClick={() => router.replace(target)}
              className="pp-accent-btn tactile w-full rounded-2xl py-3.5 text-xs font-semibold tracking-wide"
            >
              Masuk ke Portal
            </button>
            <p className="text-center text-[10px] text-[var(--pp-muted)]">
              Salsabila Dental Clinic · Data klinis terlindungi
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

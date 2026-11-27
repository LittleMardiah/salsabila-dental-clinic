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
        className="patient-portal-shell flex min-h-[100dvh] flex-col justify-between px-8"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2.5rem)',
        }}
      >
        <div className="flex justify-end">
          <PatientThemeButton />
        </div>

        <div className="pp-reveal my-auto space-y-5">
          <div className="h-[1.5px] w-10 bg-[var(--pp-accent)]" />
          <div className="space-y-2">
            <p className="font-mono-tech text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--pp-accent)]">
              Patient Portal PWA
            </p>
            <PatientBrand href="/pasien" />
          </div>
          <p className="max-w-[280px] text-xs leading-relaxed text-[var(--pp-secondary)]">
            Ruang digital yang tenang untuk memantau antrean klinik, rekam medis gigi, dan jadwal kontrol Anda.
          </p>
        </div>

        <div className="space-y-4">
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
  )
}

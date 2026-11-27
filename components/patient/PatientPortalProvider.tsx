'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import type { PortalOverview } from '@/types/patient-portal'

type PatientPortalContextValue = {
  overview: PortalOverview | null
  loading: boolean
  refresh: () => Promise<void>
  showNotice: (message: string) => void
}

const PatientPortalContext = createContext<PatientPortalContextValue | null>(null)

export function usePatientPortal(): PatientPortalContextValue {
  const value = useContext(PatientPortalContext)
  if (!value) throw new Error('usePatientPortal must be used inside PatientPortalProvider')
  return value
}

type Notice = { id: number; message: string }

export default function PatientPortalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [overview, setOverview] = useState<PortalOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastNotice = useRef<{ message: string; at: number } | null>(null)

  const showNotice = useCallback((message: string) => {
    const now = Date.now()
    // Deliberately quiet: identical messages within 2s are ignored so tab
    // switches / re-renders can never spam the floating capsule.
    if (lastNotice.current && lastNotice.current.message === message && now - lastNotice.current.at < 2000) {
      return
    }
    lastNotice.current = { message, at: now }
    setNotice({ id: now, message })
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 2800)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/overview', { cache: 'no-store' })
      if (res.status === 401) {
        router.replace('/pasien/masuk')
        return
      }
      if (!res.ok) return
      const data = await res.json()
      if (data.success) setOverview(data.data)
    } catch {
      // Keep the last snapshot; the portal stays usable on flaky connections.
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    let active = true
    const run = () => {
      if (active) void refresh()
    }
    run()
    const interval = setInterval(run, 15000)
    return () => {
      active = false
      clearInterval(interval)
      if (noticeTimer.current) clearTimeout(noticeTimer.current)
    }
  }, [refresh])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/patient-sw.js').catch(() => {
      // Installability and push are enhancements; the portal works without them.
    })
  }, [])

  const value = useMemo(
    () => ({ overview, loading, refresh, showNotice }),
    [overview, loading, refresh, showNotice]
  )

  return (
    <PatientPortalContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 z-[420] flex justify-center px-5"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.7rem)' }}
      >
        <div
          key={notice?.id ?? 'empty'}
          className={`flex max-w-[92vw] items-center gap-2.5 rounded-full border border-white/10 bg-[#1B1517]/95 px-4 py-2.5 text-[11px] font-medium text-[#F6EFEA] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-300 ${
            notice ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-3 scale-95 opacity-0'
          }`}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E5A6A6]/20 text-[#E5A6A6]">
            <Check className="h-3 w-3" />
          </span>
          <span className="min-w-0 truncate">{notice?.message || ' '}</span>
        </div>
      </div>
    </PatientPortalContext.Provider>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Volume2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useDarkMode,
  SanctuaryBrand,
  ThemeToggle,
} from '@/components/ui/sanctuary'

type Neighbour = {
  number: string
  patientNameMasked: string
  status: string
}

type BoardData = {
  queueId: number
  myQueue: {
    number: string
    position: number
    status: string
    patientName: string
    code?: string | null
  }
  prevQueue: Neighbour | null
  nextQueue: Neighbour | null
  currentCalled: {
    number: string
    patientNameMasked: string
    calledAt: string | null
  } | null
  totalToday: number
}

export default function PatientQueuePage() {
  const router = useRouter()
  const { theme } = useDarkMode()
  const [loading, setLoading] = useState(true)
  const [boardData, setBoardData] = useState<BoardData | null>(null)
  const [voiceActive, setVoiceActive] = useState(false)
  const [error, setError] = useState('')

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch('/api/queue/board', { cache: 'no-store' })
      if (res.status === 401) {
        router.replace('/patient/login')
        return
      }
      if (!res.ok) throw new Error('Gagal memuat papan antrean')
      const data = await res.json()
      if (data.success) {
        setBoardData(data)
        setError('')
      }
    } catch {
      setError('Koneksi ke papan antrean terputus. Mencoba lagi...')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    let active = true
    const run = async () => {
      if (active) await fetchBoard()
    }
    run()
    const interval = setInterval(run, 5000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [fetchBoard])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Push notifications are optional; audio calling still works.
      })
    }
  }, [])

  const playChimeAndVoice = (patient: BoardData['myQueue']) => {
    setVoiceActive(true)
    setTimeout(() => setVoiceActive(false), 2400)

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(587.33, ctx.currentTime)
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.16)
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.55)
      }
    } catch {
      // Audio is best-effort; never block the queue board.
    }

    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utter = new SpeechSynthesisUtterance(
          `Nomor antrian ${patient.number}, atas nama ${patient.patientName}, silakan menuju ruang pemeriksaan.`
        )
        utter.lang = 'id-ID'
        utter.rate = 0.94
        window.speechSynthesis.speak(utter)
      }
    } catch {
      toast.info('Suara panggilan tidak didukung di perangkat ini.')
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg} ${theme.text} flex items-center justify-center`}>
        <Loader2 className="w-6 h-6 animate-spin text-[#D08080]" />
      </div>
    )
  }

  if (!boardData) {
    return (
      <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans-clean flex flex-col`}>
        <header className="w-full shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
            <SanctuaryBrand href="/" />
            <ThemeToggle theme={theme} />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 text-center">
          <div className={`max-w-md w-full rounded-3xl border p-8 ${theme.elevatedCard}`}>
            <h1 className="text-xl font-semibold">Sesi antrean tidak ditemukan</h1>
            <p className={`mt-2 text-sm ${theme.textMuted}`}>
              {error || 'Silakan masuk kembali menggunakan kode token Anda.'}
            </p>
            <Link
              href="/patient/login"
              className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#D08080] to-[#8B4F4F] text-white text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Masuk dengan Kode Token
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const { myQueue, prevQueue, nextQueue, currentCalled, totalToday } = boardData
  const isServing = myQueue.status === 'SEDANG DILAYANI'
  const isDone = myQueue.status === 'SELESAI'

  return (
    <div
      className={`min-h-screen w-full max-w-full ${theme.bg} ${theme.text} font-sans-clean relative overflow-x-hidden transition-colors duration-700 flex flex-col`}
    >
      <header className="relative z-30 w-full shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          <SanctuaryBrand href="/" />
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle theme={theme} />
            <Link
              href="/patient/login"
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border text-[11px] sm:text-xs font-normal transition-all hover:border-[#D08080] ${theme.pillSurface}`}
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#D08080]" />
              <span>Ganti Kode</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 animate-view-enter">
        <div
          aria-hidden="true"
          style={{
            animation: 'silkAuroraBreath 16s ease-in-out infinite',
            background:
              'radial-gradient(ellipse 60% 45% at 25% 35%, rgba(208,128,128,0.16), transparent 70%)',
          }}
          className="pointer-events-none absolute inset-0 blur-2xl"
        />

        <div className={`relative z-10 flex flex-wrap items-center justify-between gap-3 pb-5 border-b ${theme.hairline}`}>
          <span className={`text-xs font-medium ${theme.textSubtle}`}>
            Papan antrean klinik diperbarui otomatis setiap 5 detik
          </span>
          <span className={`px-3.5 py-1 rounded-full border text-xs font-medium ${theme.pillSurface}`}>
            Token Aktif:{' '}
            <strong className="text-[#D08080] tracking-[0.12em]">
              {myQueue.code || 'TERVERIFIKASI'}
            </strong>
          </span>
        </div>

        {error && (
          <p className="mt-3 text-xs text-[#D08080] font-medium" role="status">
            {error}
          </p>
        )}

        <div className="relative z-10 mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch">
          {/* MY TICKET */}
          <div className={`lg:col-span-6 rounded-3xl border p-6 sm:p-10 flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 ${theme.elevatedCard}`}>
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D08080]/15 text-[#D08080] text-xs font-medium">
                <span className={`w-2 h-2 rounded-full ${isServing ? 'bg-emerald-500 animate-pulse' : 'bg-[#D08080] animate-pulse'}`} />
                <span>{myQueue.status}</span>
              </span>

              <div className={`mt-6 text-sm ${theme.textMuted}`}>
                Nomor Antrian Anda •{' '}
                <span className={`font-semibold ${theme.text}`}>{myQueue.patientName}</span>
              </div>

              <div className={`mt-2 text-6xl sm:text-8xl font-semibold tracking-tight tabular-nums ${theme.roseAccent}`}>
                {myQueue.number}
              </div>

              <p className={`mt-4 text-xs sm:text-sm leading-relaxed ${theme.textMuted}`}>
                {isServing
                  ? 'Giliran Anda saat ini. Silakan menuju ruang pemeriksaan.'
                  : isDone
                  ? 'Kunjungan Anda telah selesai. Terima kasih telah mempercayakan perawatan Anda kepada Salsabila Dental Clinic.'
                  : prevQueue
                  ? `Posisi ke-${myQueue.position} dalam antrean (${prevQueue.number} diproses sebelum Anda).`
                  : 'Anda berada di urutan terdepan dalam antrean.'}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => playChimeAndVoice(myQueue)}
                className={`inline-flex items-center gap-2 px-4 sm:px-5 py-3 rounded-full border text-xs font-medium transition-all cursor-pointer ${
                  voiceActive
                    ? 'bg-[#D08080] border-[#D08080] text-white'
                    : `${theme.pillSurface} hover:border-[#D08080]`
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>{voiceActive ? 'Suara Panggilan Aktif' : 'Aktifkan Suara Panggilan'}</span>
              </button>
            </div>
          </div>

          {/* BOARD */}
          <div className={`lg:col-span-6 rounded-3xl border p-6 sm:p-10 space-y-6 transition-all duration-300 hover:-translate-y-0.5 ${theme.elevatedCard}`}>
            <div>
              <span className={`text-xs font-medium ${theme.roseLabel}`}>Pemantauan Langsung</span>
              <h2 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight">
                Papan Antrian Klinis
              </h2>
            </div>

            <div className={`border-y ${theme.hairline} divide-y ${theme.divideHairline}`}>
              <div className="py-4 flex items-center justify-between gap-4 rounded-xl px-2">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Sedang Dilayani Saat Ini</span>
                  </span>
                  <span className="mt-1 block text-sm sm:text-base font-semibold truncate">
                    {currentCalled
                      ? `${currentCalled.number} — ${currentCalled.patientNameMasked}`
                      : 'Belum ada'}
                  </span>
                </div>
              </div>

              <div className="py-4 flex items-center justify-between gap-4 rounded-xl px-2">
                <div className="min-w-0">
                  <span className={`block text-xs ${theme.textSubtle}`}>1 Antrean Sebelum Anda</span>
                  <span className="mt-1 block text-sm sm:text-base font-medium truncate">
                    {prevQueue
                      ? `${prevQueue.number} — ${prevQueue.patientNameMasked}`
                      : 'Tidak ada (Anda urutan pertama)'}
                  </span>
                </div>
                {prevQueue && (
                  <span className="text-[10px] font-medium text-emerald-500 shrink-0">
                    {prevQueue.status}
                  </span>
                )}
              </div>

              <div className="py-4 flex items-center justify-between gap-4 rounded-xl px-2 bg-[#D08080]/[0.06]">
                <div className="min-w-0">
                  <span className="block text-xs font-medium text-[#D08080]">Posisi Anda</span>
                  <span className={`mt-1 block text-base sm:text-lg font-semibold truncate ${theme.roseAccent}`}>
                    {myQueue.number} — {myQueue.patientName}
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#D08080]/20 text-[#D08080] text-xs font-medium shrink-0">
                  Anda
                </span>
              </div>

              <div className="py-4 flex items-center justify-between gap-4 rounded-xl px-2">
                <div className="min-w-0">
                  <span className={`block text-xs ${theme.textSubtle}`}>1 Antrean Setelah Anda</span>
                  <span className="mt-1 block text-sm sm:text-base font-medium truncate">
                    {nextQueue
                      ? `${nextQueue.number} — ${nextQueue.patientNameMasked}`
                      : 'Belum ada antrean berikutnya'}
                  </span>
                </div>
                {nextQueue && (
                  <span className={`text-[10px] shrink-0 ${theme.textSubtle}`}>{nextQueue.status}</span>
                )}
              </div>
            </div>

            <p className={`text-[11px] font-mono-tech uppercase tracking-[0.14em] ${theme.textSubtle}`}>
              Total antrean hari ini: {String(totalToday).padStart(2, '0')}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useDarkMode,
  SanctuaryBrand,
  ThemeToggle,
} from '@/components/ui/sanctuary'

export default function PatientLogin() {
  const router = useRouter()
  const { theme } = useDarkMode()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = code.trim().toUpperCase().replace(/\s+/g, '')

    if (cleaned.length !== 6) {
      setError('Masukkan 6 karakter kode token dari klinik.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/patient/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleaned }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const message =
          data.error === 'Invalid or expired code'
            ? 'Kode tidak ditemukan atau sudah kedaluwarsa. Hubungi resepsionis klinik.'
            : data.error || 'Kode antrean tidak valid.'
        setError(message)
        toast.error(message)
        return
      }

      toast.success('Kode terverifikasi. Membuka papan antrean...')
      router.push('/patient/queue')
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.')
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`min-h-screen w-full max-w-full ${theme.bg} ${theme.text} font-sans-clean relative overflow-x-hidden transition-colors duration-700 flex flex-col`}
    >
      <header className="relative z-30 w-full shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          <SanctuaryBrand href="/" />
          <ThemeToggle theme={theme} />
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col justify-center max-w-xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center animate-view-enter">
        <div
          aria-hidden="true"
          style={{
            animation: 'silkAuroraBreath 14s ease-in-out infinite',
            background:
              'radial-gradient(circle at 50% 50%, rgba(208,128,128,0.24), transparent 68%)',
          }}
          className="pointer-events-none absolute inset-0 blur-2xl"
        />

        <div
          className={`relative z-10 rounded-3xl border p-6 sm:p-10 md:p-12 transition-all duration-300 hover:-translate-y-0.5 ${theme.elevatedCard}`}
        >
          <Link
            href="/"
            className={`inline-flex items-center justify-center gap-2 text-xs font-medium ${theme.textSubtle} hover:text-[#D08080] mb-6 sm:mb-7 cursor-pointer`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>

          <span
            className={`inline-block px-3.5 py-1 rounded-full bg-[#D08080]/15 text-xs font-medium ${theme.roseLabel}`}
          >
            Portal Antrian Pasien
          </span>

          <h1 className="mt-4 text-2xl sm:text-4xl font-semibold tracking-tight">
            Masukkan <span className={theme.roseAccent}>Kode Antrian</span>
          </h1>

          <p className={`mt-2.5 text-xs sm:text-sm font-normal leading-relaxed ${theme.textMuted}`}>
            Gunakan 6 karakter token yang Anda terima dari staf klinik saat pendaftaran.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 sm:mt-8 space-y-6">
            <input
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                setError('')
              }}
              placeholder="E4ZEQW"
              aria-label="Kode antrean 6 karakter"
              className={`w-full px-4 sm:px-6 py-4 rounded-2xl border text-center text-2xl sm:text-3xl font-semibold tracking-[0.3em] uppercase shadow-[inset_0_2px_6px_rgba(139,79,79,0.08)] focus:outline-none focus:border-[#D08080] transition-all ${theme.inputBg}`}
            />

            {error && (
              <p role="alert" className="text-xs text-[#D08080] font-medium">
                {error}
              </p>
            )}

            <div className={`text-xs leading-relaxed ${theme.textSubtle}`}>
              Belum menerima kode? Hubungi resepsionis klinik.
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              style={{
                background:
                  'linear-gradient(135deg, #DC9696 0%, #D08080 55%, #8B4F4F 100%)',
              }}
              className="w-full py-4 rounded-full text-white text-sm font-medium inline-flex items-center justify-center gap-2.5 shadow-[0_14px_34px_-10px_rgba(139,79,79,0.45)] hover:-translate-y-0.5 hover:opacity-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className={`mt-7 pt-5 border-t ${theme.hairline} flex items-center justify-center gap-2 text-[10px] font-mono-tech uppercase tracking-[0.16em] ${theme.textSubtle}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Akses terenkripsi &amp; dicatat
          </div>
        </div>
      </main>
    </div>
  )
}

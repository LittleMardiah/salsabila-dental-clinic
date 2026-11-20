'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Lock, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  useDarkMode,
  SanctuaryBrand,
  ThemeToggle,
} from '@/components/ui/sanctuary'

const OPERATORS = ['Drg. Salsabila', 'Admin Resepsionis'] as const

export default function AdminLoginPage() {
  const router = useRouter()
  const { theme } = useDarkMode()
  const [step, setStep] = useState<1 | 2>(1)
  const [vaultCode, setVaultCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [operator, setOperator] = useState<(typeof OPERATORS)[number]>('Drg. Salsabila')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/auth/admin/check', { cache: 'no-store' })
        if (res.ok) router.replace('/admin/dashboard')
      } catch {
        // Not logged in.
      }
    }
    check()
  }, [router])

  const handleVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (vaultCode.length !== 8) {
      setError('Masukkan kode vault 8 digit.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/admin/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: vaultCode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Kode vault tidak valid.')
        toast.error(data.error || 'Kode vault tidak valid')
        return
      }
      toast.success('Gerbang vault terbuka')
      setStep(2)
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message =
          data.error === 'Verification code required. Please go back and enter the 8-digit code first.'
            ? 'Sesi vault telah kedaluwarsa. Ulangi Tahap 1.'
            : data.error || 'Username atau password salah.'
        setError(message)
        toast.error(message)
        if (!res.ok && res.status === 403) setStep(1)
        return
      }

      localStorage.setItem('salsa_operator', operator)
      toast.success(`Masuk sebagai ${operator}`)
      router.replace('/admin/dashboard')
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.')
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

      <main className="relative z-10 flex-1 flex flex-col justify-center max-w-md w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center animate-view-enter">
        <div
          aria-hidden="true"
          style={{
            animation: 'silkAuroraBreath 14s ease-in-out infinite',
            background:
              'radial-gradient(circle at 50% 50%, rgba(208,128,128,0.22), transparent 68%)',
          }}
          className="pointer-events-none absolute inset-0 blur-2xl"
        />

        <div
          key={`vault-step-${step}`}
          className={`relative z-10 rounded-3xl border p-6 sm:p-10 animate-view-enter ${theme.elevatedCard}`}
        >
          <button
            type="button"
            onClick={() => {
              if (step === 2) {
                setStep(1)
                setError('')
              } else {
                router.push('/')
              }
            }}
            className={`inline-flex items-center justify-center gap-2 text-xs font-medium ${theme.textSubtle} hover:text-[#D08080] mb-6 cursor-pointer`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{step === 2 ? 'Kembali ke Tahap 1' : 'Kembali ke Beranda'}</span>
          </button>

          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#D08080]/15 border border-[#D08080]/30 flex items-center justify-center text-[#D08080] shadow-[0_8px_20px_-6px_rgba(208,128,128,0.35)]">
            <Lock className="w-5 h-5" />
          </div>

          <span className={`mt-5 inline-block px-3 py-1 rounded-full bg-[#D08080]/12 text-xs font-medium ${theme.roseLabel}`}>
            {step === 1 ? 'Tahap 1 • Kode Keamanan Vault' : 'Tahap 2 • Kredensial Dokter & Staf'}
          </span>

          <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
            {step === 1 ? 'Akses Admin Terbatas' : 'Selamat Datang'}
          </h1>

          <p className={`mt-2 text-xs sm:text-sm leading-relaxed ${theme.textMuted}`}>
            {step === 1
              ? 'Masukkan 8 digit kode vault untuk membuka gerbang klinis.'
              : 'Silakan masuk menggunakan akun staf klinik dan pilih operator aktif.'}
          </p>

          {step === 1 ? (
            <form onSubmit={handleVaultSubmit} className="mt-7 space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={vaultCode}
                onChange={(e) => {
                  setVaultCode(e.target.value.replace(/\D/g, ''))
                  setError('')
                }}
                placeholder="• • • • • • • •"
                aria-label="Kode vault"
                className={`w-full px-5 py-4 rounded-2xl border text-center text-xl font-semibold tracking-[0.35em] shadow-[inset_0_2px_6px_rgba(139,79,79,0.08)] focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
              />
              {error && (
                <p role="alert" className="text-xs text-[#D08080] font-medium">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || vaultCode.length !== 8}
                style={{
                  background:
                    'linear-gradient(135deg, #DC9696 0%, #D08080 55%, #8B4F4F 100%)',
                }}
                className="w-full py-4 rounded-full text-white text-sm font-medium shadow-[0_14px_34px_-10px_rgba(139,79,79,0.45)] hover:-translate-y-0.5 hover:opacity-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 inline-flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Buka Gerbang Vault</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleCredentialSubmit} className="mt-7 space-y-4 text-left">
              <div>
                <span className="block text-xs font-medium mb-2">Operator Aktif</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {OPERATORS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setOperator(item)}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-medium transition-all cursor-pointer ${
                        operator === item
                          ? 'bg-[#D08080]/15 border-[#D08080] text-[#D08080]'
                          : theme.pillSurface
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span className="truncate">{item}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="admin-username" className="block text-xs font-medium mb-1">
                  Username Akun
                </label>
                <input
                  id="admin-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  className={`w-full px-4 py-3.5 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-xs font-medium mb-1">
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  autoComplete="current-password"
                  className={`w-full px-4 py-3.5 rounded-2xl border text-sm focus:outline-none focus:border-[#D08080] ${theme.inputBg}`}
                />
              </div>

              {error && (
                <p role="alert" className="text-xs text-[#D08080] font-medium">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !username.trim() || password.length < 6}
                style={{
                  background:
                    'linear-gradient(135deg, #DC9696 0%, #D08080 55%, #8B4F4F 100%)',
                }}
                className="w-full py-4 rounded-full text-white text-sm font-medium shadow-[0_14px_34px_-10px_rgba(139,79,79,0.45)] hover:-translate-y-0.5 hover:opacity-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 inline-flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Masuk Dashboard</span>
              </button>
            </form>
          )}

          <div className={`mt-6 pt-5 border-t ${theme.hairline}`}>
            <Link
              href="/patient/login"
              className={`text-[11px] font-medium ${theme.textSubtle} hover:text-[#D08080]`}
            >
              Saya pasien — masuk dengan kode antrean
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

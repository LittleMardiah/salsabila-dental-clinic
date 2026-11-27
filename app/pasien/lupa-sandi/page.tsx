'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import PatientAuthShell from '@/components/patient/PatientAuthShell'
import PasswordStrength from '@/components/patient/PasswordStrength'
import { isPasswordAcceptable } from '@/lib/password-policy'

export default function PasienLupaSandiPage() {
  const router = useRouter()
  const [step, setStep] = useState<'identify' | 'verify'>('identify')
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [resetTicket, setResetTicket] = useState('')
  const [password, setPassword] = useState('')
  const [demoOtp, setDemoOtp] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const sendOtp = async (resend = false) => {
    if (!identifier.trim()) {
      setError('Masukkan email atau nomor WhatsApp terdaftar.')
      return
    }
    setError('')
    setInfo('')
    if (resend) setResending(true)
    else setLoading(true)
    try {
      const res = await fetch('/api/portal/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Kode OTP belum dapat dikirim.')
        return
      }
      setDemoOtp(data.demoOtp || '')
      setInfo(data.message || 'Kode OTP sudah disiapkan.')
      setStep('verify')
      setOtp('')
      setResetTicket('')
      setPassword('')
    } catch {
      setError('Koneksi terputus. Silakan coba lagi.')
    } finally {
      setLoading(false)
      setResending(false)
    }
  }

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const res = await fetch('/api/portal/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp: otp.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Kode OTP tidak valid.')
        return
      }
      setResetTicket(data.resetTicket)
      setInfo('Kode OTP terverifikasi. Buat kata sandi baru Anda.')
    } catch {
      setError('Koneksi terputus. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordAcceptable(password)) {
      setError('Kata sandi belum cukup kuat. Ikuti checklist keamanan.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/portal/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetTicket, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Kata sandi belum dapat disimpan.')
        return
      }
      router.replace('/pasien/beranda')
    } catch {
      setError('Koneksi terputus. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PatientAuthShell
      eyebrow="Pemulihan Akun"
      title="Lupa Sandi"
      subtitle={
        step === 'identify'
          ? 'Masukkan email atau nomor WhatsApp terdaftar untuk menerima kode OTP.'
          : resetTicket
            ? 'Kode terverifikasi. Buat kata sandi baru untuk akun pasien Anda.'
            : 'Masukkan kode OTP 6 digit yang sudah kami siapkan.'
      }
      backHref="/pasien/masuk"
      backLabel="Kembali ke masuk"
    >
      {step === 'identify' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void sendOtp(false)
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="forgot-identifier" className="text-[11px] font-medium text-[var(--pp-secondary)]">
              Email atau No. WhatsApp
            </label>
            <input
              id="forgot-identifier"
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value)
                setError('')
              }}
              placeholder="nama@email.com atau 0812 xxxx xxxx"
              required
              className="pp-input w-full rounded-2xl px-4 py-3 text-xs"
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] font-medium text-rose-500">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="pp-accent-btn tactile inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-semibold disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {loading ? 'Menyiapkan kode...' : 'Kirim Kode OTP'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-[var(--pp-accent-soft)] px-3 py-2 text-[10px] font-medium text-[var(--pp-accent)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Langkah 2 dari 2 · verifikasi OTP lalu simpan kata sandi baru
          </div>

          {!resetTicket ? (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="forgot-otp" className="text-[11px] font-medium text-[var(--pp-secondary)]">
                  Kode OTP 6-Digit
                </label>
                <input
                  id="forgot-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                    setError('')
                  }}
                  placeholder="••••••"
                  required
                  className="pp-input w-full rounded-2xl px-4 py-3 text-center font-mono-tech text-lg tracking-[0.4em]"
                />
              </div>

              {demoOtp ? (
                <div className="rounded-xl border border-[var(--pp-hairline)] bg-[var(--pp-soft)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--pp-secondary)]">
                  Mode uji coba (email belum terhubung): kode OTP Anda{' '}
                  <strong className="font-mono-tech tracking-[0.18em] text-[var(--pp-accent)]">{demoOtp}</strong>
                </div>
              ) : null}

              {error ? (
                <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] font-medium text-rose-500">
                  {error}
                </p>
              ) : null}
              {info && !error ? (
                <p className="rounded-xl bg-[var(--pp-accent-soft)] px-3 py-2 text-[11px] font-medium text-[var(--pp-accent)]">
                  {info}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="pp-accent-btn tactile inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-semibold disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {loading ? 'Memverifikasi...' : 'Verifikasi Kode'}
              </button>

              <button
                type="button"
                onClick={() => void sendOtp(true)}
                disabled={resending}
                className="w-full text-center text-[11px] font-medium text-[var(--pp-accent)] hover:underline disabled:opacity-60"
              >
                {resending ? 'Mengirim ulang...' : 'Kirim ulang kode OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={savePassword} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="forgot-password" className="text-[11px] font-medium text-[var(--pp-secondary)]">
                  Kata Sandi Baru
                </label>
                <input
                  id="forgot-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  placeholder="Masukkan kata sandi baru"
                  required
                  className="pp-input w-full rounded-2xl px-4 py-3 text-xs"
                />
              </div>

              <PasswordStrength value={password} />

              {error ? (
                <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] font-medium text-rose-500">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="pp-accent-btn tactile inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-semibold disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {loading ? 'Menyimpan...' : 'Simpan Kata Sandi'}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => {
              setStep('identify')
              setResetTicket('')
              setError('')
              setInfo('')
            }}
            className="w-full text-center text-[11px] text-[var(--pp-muted)] hover:text-[var(--pp-text)]"
          >
            Ganti email / nomor WhatsApp
          </button>
        </div>
      )}

      <p className="mt-5 text-center text-[10px] leading-relaxed text-[var(--pp-muted)]">
        Butuh bantuan? Hubungi resepsionis klinik di 0813 8753 0407.
      </p>
    </PatientAuthShell>
  )
}

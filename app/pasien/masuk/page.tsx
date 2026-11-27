'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'
import PatientAuthShell from '@/components/patient/PatientAuthShell'

type DemoPersona = 'history' | 'new'

const DEMO_CREDENTIALS: Record<DemoPersona, { email: string; label: string }> = {
  history: { email: 'rina@demo.salsabila.clinic', label: 'Rina Marlina' },
  new: { email: 'budi@demo.salsabila.clinic', label: 'Budi Santoso' },
}

export default function PasienMasukPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState<DemoPersona | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/portal/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Tidak dapat masuk. Periksa kembali data Anda.')
        return
      }
      router.replace('/pasien/beranda')
    } catch {
      setError('Koneksi terputus. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const enterDemo = async (persona: DemoPersona) => {
    setError('')
    setDemoLoading(persona)
    try {
      const res = await fetch('/api/portal/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Still make the demo usable: prefill the form so the patient can
        // press "Masuk ke Portal" themselves instead of hitting a dead end.
        setIdentifier(DEMO_CREDENTIALS[persona].email)
        setPassword('SalsaPatient2026')
        setError(
          `${data.error || 'Akun demo belum siap.'} Kredensial ${DEMO_CREDENTIALS[persona].label} sudah diisi — tekan “Masuk ke Portal”.`
        )
        return
      }
      router.replace('/pasien/beranda')
    } catch {
      setIdentifier(DEMO_CREDENTIALS[persona].email)
      setPassword('SalsaPatient2026')
      setError('Koneksi terputus saat menyiapkan akun demo. Kredensial demo sudah diisi — tekan “Masuk ke Portal”.')
    } finally {
      setDemoLoading(null)
    }
  }

  return (
    <PatientAuthShell
      eyebrow="Akses Pasien"
      title="Selamat Datang"
      subtitle="Masuk ke portal pasien dengan email atau nomor WhatsApp terdaftar."
      backHref="/"
      backLabel="Beranda klinik"
      footer={
        <p className="text-xs text-[var(--pp-secondary)]">
          Belum memiliki akun pasien?{' '}
          <Link href="/pasien/daftar" className="ml-1 font-semibold text-[var(--pp-accent)] hover:underline">
            Daftar Akun
          </Link>
        </p>
      }
    >
      <div className="mb-5 space-y-2.5 rounded-2xl border border-[var(--pp-hairline)] bg-[var(--pp-elevated)] p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--pp-muted)]">
            Isi cepat akun demo
          </p>
          <span className="text-[10px] text-[var(--pp-muted)]">Langsung masuk</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => enterDemo('history')}
            disabled={demoLoading !== null}
            aria-busy={demoLoading === 'history'}
            className="tactile rounded-xl bg-[var(--pp-accent-soft)] p-2.5 text-left transition-opacity disabled:opacity-60"
          >
            <p className="text-[11px] font-semibold text-[var(--pp-accent)]">
              {demoLoading === 'history' ? 'Menyiapkan...' : 'Rina Marlina'}
            </p>
            <p className="text-[10px] text-[var(--pp-secondary)]">EMR + Jadwal</p>
          </button>
          <button
            type="button"
            onClick={() => enterDemo('new')}
            disabled={demoLoading !== null}
            aria-busy={demoLoading === 'new'}
            className="tactile rounded-xl border border-[var(--pp-hairline)] bg-[var(--pp-soft)] p-2.5 text-left transition-opacity disabled:opacity-60"
          >
            <p className="text-[11px] font-semibold text-[var(--pp-text)]">
              {demoLoading === 'new' ? 'Menyiapkan...' : 'Budi Santoso'}
            </p>
            <p className="text-[10px] text-[var(--pp-secondary)]">Pasien Baru</p>
          </button>
        </div>
        <p className="text-[10px] leading-relaxed text-[var(--pp-muted)]">
          Sandi demo: <span className="font-mono-tech">SalsaPatient2026</span> · akun uji coba, data contoh
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="patient-identifier" className="text-[11px] font-medium text-[var(--pp-secondary)]">
            Email atau No. WhatsApp
          </label>
          <input
            id="patient-identifier"
            type="text"
            inputMode="email"
            autoComplete="username"
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="patient-password" className="text-[11px] font-medium text-[var(--pp-secondary)]">
              Kata Sandi
            </label>
            <Link
              href="/pasien/lupa-sandi"
              className="text-[11px] font-medium text-[var(--pp-accent)] hover:underline"
            >
              Lupa sandi?
            </Link>
          </div>
          <div className="relative">
            <input
              id="patient-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="Masukkan kata sandi"
              required
              className="pp-input w-full rounded-2xl px-4 py-3 pr-11 text-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-[var(--pp-muted)] hover:text-[var(--pp-text)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] font-medium leading-relaxed text-rose-500"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || demoLoading !== null}
          className="pp-accent-btn tactile inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-semibold tracking-wide disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {loading ? 'Memeriksa akun...' : 'Masuk ke Portal'}
        </button>
      </form>

      <p className="mt-5 text-center text-[10px] leading-relaxed text-[var(--pp-muted)]">
        Sesi pasien terpisah dari akun Admin klinik. Tidak ada data keuangan atau audit yang ditampilkan di
        portal ini.
      </p>
    </PatientAuthShell>
  )
}

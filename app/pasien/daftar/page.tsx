'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus } from 'lucide-react'
import PatientAuthShell from '@/components/patient/PatientAuthShell'
import PasswordStrength from '@/components/patient/PasswordStrength'
import { isPasswordAcceptable } from '@/lib/password-policy'

const todayISO = new Date().toISOString().slice(0, 10)

export default function PasienDaftarPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    birthDate: '',
    phone: '',
    email: '',
    password: '',
    allergies: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setError('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordAcceptable(form.password)) {
      setError('Kata sandi belum cukup kuat. Ikuti checklist keamanan di bawah kolom kata sandi.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/portal/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Pendaftaran belum berhasil. Periksa kembali data Anda.')
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
      eyebrow="Akun Baru"
      title="Daftar Akun"
      subtitle="Lengkapi identitas dasar untuk membuat kartu pasien digital Anda."
      backHref="/pasien/masuk"
      footer={
        <p className="text-xs text-[var(--pp-secondary)]">
          Sudah punya akun?{' '}
          <Link href="/pasien/masuk" className="ml-1 font-semibold text-[var(--pp-accent)] hover:underline">
            Masuk
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="reg-name" className="text-[11px] font-medium text-[var(--pp-secondary)]">
            Nama Lengkap
          </label>
          <input
            id="reg-name"
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Contoh: Nadia Putri"
            autoComplete="name"
            required
            className="pp-input w-full rounded-2xl px-4 py-2.5 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="reg-birth" className="text-[11px] font-medium text-[var(--pp-secondary)]">
            Tanggal Lahir
          </label>
          <input
            id="reg-birth"
            type="date"
            value={form.birthDate}
            onChange={(e) => update('birthDate', e.target.value)}
            max={todayISO}
            autoComplete="bday"
            required
            className="pp-input w-full rounded-2xl px-4 py-2.5 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="reg-phone" className="text-[11px] font-medium text-[var(--pp-secondary)]">
            No. WhatsApp
          </label>
          <input
            id="reg-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="0812 xxxx xxxx"
            autoComplete="tel"
            required
            className="pp-input w-full rounded-2xl px-4 py-2.5 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="reg-email" className="text-[11px] font-medium text-[var(--pp-secondary)]">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="nama@email.com"
            autoComplete="email"
            required
            className="pp-input w-full rounded-2xl px-4 py-2.5 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="reg-allergy" className="text-[11px] font-medium text-[var(--pp-secondary)]">
            Catatan Alergi <span className="text-[var(--pp-muted)]">(opsional)</span>
          </label>
          <input
            id="reg-allergy"
            type="text"
            value={form.allergies}
            onChange={(e) => update('allergies', e.target.value)}
            placeholder="Contoh: alergi penisilin"
            className="pp-input w-full rounded-2xl px-4 py-2.5 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="reg-password" className="text-[11px] font-medium text-[var(--pp-secondary)]">
            Kata Sandi
          </label>
          <input
            id="reg-password"
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder="Buat kata sandi yang aman"
            autoComplete="new-password"
            required
            className="pp-input w-full rounded-2xl px-4 py-2.5 text-xs"
          />
        </div>

        <PasswordStrength value={form.password} />

        <div className="rounded-2xl border border-[var(--pp-hairline)] bg-[var(--pp-soft)] p-3 text-[11px] leading-relaxed text-[var(--pp-secondary)]">
          Rekam medis dimulai dalam kondisi kosong. Peta gigi, diagnosa, dan dokumentasi foto akan terisi
          otomatis setelah kunjungan pertama Anda diperiksa dokter.
        </div>

        {error ? (
          <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] font-medium text-rose-500">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="pp-accent-btn tactile inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-semibold tracking-wide disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {loading ? 'Membuat akun...' : 'Daftar & Masuk'}
        </button>
      </form>
    </PatientAuthShell>
  )
}

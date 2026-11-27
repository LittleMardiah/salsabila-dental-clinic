'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  Copy,
  Download,
  Loader2,
  LogOut,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react'
import { PatientThemeButton } from '@/components/patient/PatientBrand'
import { usePatientPortal } from '@/components/patient/PatientPortalProvider'
import { formatDateID } from '@/lib/ui-theme'
import type { PortalProfileResponse } from '@/types/patient-portal'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const emptyForm = { name: '', birthDate: '', phone: '', email: '', allergies: '' }

export default function PasienProfilPage() {
  const router = useRouter()
  const { refresh, showNotice } = usePatientPortal()
  const [profile, setProfile] = useState<PortalProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installSheet, setInstallSheet] = useState(false)
  const [standalone, setStandalone] = useState(false)

  const applyProfile = useCallback((data: PortalProfileResponse) => {
    setProfile(data)
    setForm({
      name: data.patient.name,
      birthDate: data.patient.dateOfBirth ? data.patient.dateOfBirth.slice(0, 10) : '',
      phone: data.patient.phone || '',
      email: data.patient.email || data.email,
      allergies: data.patient.allergies || '',
    })
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/profile', { cache: 'no-store' })
      if (res.status === 401) {
        router.replace('/pasien/masuk')
        return
      }
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || 'Profil belum dapat dimuat.')
        return
      }
      applyProfile(body.data)
    } catch {
      setError('Koneksi terputus. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }, [applyProfile, router])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    setStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    )
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const copyRm = async () => {
    const noRm = profile?.patient.noRm
    if (!noRm) {
      showNotice('No. RM belum diterbitkan oleh klinik')
      return
    }
    try {
      await navigator.clipboard.writeText(noRm)
      showNotice(`No. RM ${noRm} disalin`)
    } catch {
      showNotice(`No. RM: ${noRm}`)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          birthDate: form.birthDate || undefined,
          allergies: form.allergies,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || 'Perubahan belum dapat disimpan.')
        return
      }
      setProfile((current) =>
        current
          ? {
              ...current,
              email: form.email.trim().toLowerCase(),
              patient: {
                ...current.patient,
                ...body.data,
              },
            }
          : current
      )
      setEditing(false)
      await refresh()
      showNotice('Perubahan data pribadi disimpan')
    } catch {
      setError('Koneksi terputus. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const installApp = async () => {
    if (!installEvent) {
      setInstallSheet(true)
      return
    }
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    setInstallEvent(null)
    if (choice.outcome === 'accepted') {
      setStandalone(true)
      showNotice('Aplikasi siap di layar utama')
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/portal/auth/logout', { method: 'POST' })
    } finally {
      router.replace('/pasien/masuk')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--pp-accent)]" />
      </div>
    )
  }

  const patient = profile?.patient

  return (
    <div className="pp-reveal space-y-6 px-6 py-5">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--pp-accent)]">
          Identitas Pasien
        </p>
        <h1 className="font-editorial text-[30px] font-semibold leading-none tracking-tight text-[var(--pp-text)]">
          Profil Saya
        </h1>
      </div>

      <section className="pp-card space-y-4 rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--pp-muted)]">
              Identitas Klinik
            </p>
            <h2 className="mt-0.5 font-editorial text-2xl font-semibold text-[var(--pp-text)]">
              {patient?.name || 'Pasien'}
            </h2>
          </div>
          <span className="rounded-full bg-[var(--pp-accent-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--pp-accent)]">
            Terdaftar
          </span>
        </div>

        <div className="space-y-2 rounded-2xl border border-[var(--pp-hairline)] bg-[var(--pp-soft)] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] text-[var(--pp-secondary)]">Nomor Rekam Medis (No. RM)</p>
              <p className="mt-0.5 font-mono-tech text-base font-semibold tracking-wider text-[var(--pp-accent)]">
                {patient?.noRm || 'Belum diterbitkan'}
              </p>
            </div>
            <button
              type="button"
              onClick={copyRm}
              className="tactile inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--pp-hairline)] bg-[var(--pp-elevated)] px-3 py-2 text-[11px] font-semibold text-[var(--pp-text)]"
            >
              <Copy className="h-3.5 w-3.5" />
              Salin No. RM
            </button>
          </div>
          <p className="border-t border-[var(--pp-hairline)] pt-2 text-[11px] leading-relaxed text-[var(--pp-secondary)]">
            Nomor identitas unik pasien di klinik untuk verifikasi cepat di meja pendaftaran dan pencocokan
            seluruh riwayat perawatan Anda. Nomor ini sama dengan yang tampil di Dashboard Admin.
          </p>
        </div>
      </section>

      <section className="pp-card space-y-4 rounded-[26px] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[var(--pp-text)]">Data Pribadi</h3>
          <button
            type="button"
            onClick={() => {
              setEditing((value) => !value)
              setError('')
            }}
            className="text-[11px] font-semibold text-[var(--pp-accent)] hover:underline"
          >
            {editing ? 'Batal' : 'Edit'}
          </button>
        </div>

        {editing ? (
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="pf-name" className="text-[10px] font-medium text-[var(--pp-secondary)]">
                Nama Lengkap
              </label>
              <input
                id="pf-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="pp-input w-full rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pf-birth" className="text-[10px] font-medium text-[var(--pp-secondary)]">
                Tanggal Lahir
              </label>
              <input
                id="pf-birth"
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                className="pp-input w-full rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pf-phone" className="text-[10px] font-medium text-[var(--pp-secondary)]">
                No. WhatsApp
              </label>
              <input
                id="pf-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                className="pp-input w-full rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pf-email" className="text-[10px] font-medium text-[var(--pp-secondary)]">
                Email
              </label>
              <input
                id="pf-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="pp-input w-full rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pf-allergy" className="text-[10px] font-medium text-[var(--pp-secondary)]">
                Catatan Alergi
              </label>
              <input
                id="pf-allergy"
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                placeholder="Contoh: alergi penisilin"
                className="pp-input w-full rounded-xl px-3.5 py-2.5 text-xs"
              />
            </div>

            {error ? (
              <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] font-medium text-rose-500">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="pp-accent-btn tactile inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        ) : (
          <div className="divide-y divide-[var(--pp-hairline)]">
            {[
              ['Nama Lengkap', patient?.name],
              ['Tanggal Lahir', patient?.dateOfBirth ? formatDateID(patient.dateOfBirth) : '-'],
              ['No. WhatsApp', patient?.phone],
              ['Email', patient?.email || profile?.email],
              ['Catatan Alergi', patient?.allergies || 'Belum ada catatan alergi'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5 text-xs">
                <span className="text-[var(--pp-secondary)]">{label}</span>
                <span className="max-w-[190px] truncate text-right font-medium text-[var(--pp-text)]">
                  {value || '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="pp-card flex items-center justify-between gap-3 rounded-2xl p-4">
        <div>
          <p className="text-xs font-semibold text-[var(--pp-text)]">Tema Tampilan</p>
          <p className="text-[11px] text-[var(--pp-secondary)]">Nyaman untuk mata, siang maupun malam</p>
        </div>
        <PatientThemeButton />
      </section>

      <section className="pp-card flex items-center justify-between gap-3 rounded-2xl p-4">
        <div>
          <p className="text-xs font-semibold text-[var(--pp-text)]">Pasang ke Layar Utama HP</p>
          <p className="text-[11px] text-[var(--pp-secondary)]">
            {standalone ? 'Terpasang di layar utama HP Anda' : 'Akses instan tanpa membuka browser'}
          </p>
        </div>
        <button
          type="button"
          onClick={installApp}
          className={`tactile shrink-0 rounded-xl px-3.5 py-2 text-[11px] font-semibold ${
            standalone
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
              : 'pp-accent-btn'
          }`}
        >
          {standalone ? 'Terpasang ✓' : 'Pasang PWA'}
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--pp-hairline)] bg-[var(--pp-soft)] p-4 text-[11px] leading-relaxed text-[var(--pp-secondary)]">
        <p className="mb-1 flex items-center gap-1.5 font-semibold text-[var(--pp-text)]">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--pp-accent)]" />
          Privasi data klinis
        </p>
        Portal ini hanya menampilkan rekam medis milik akun yang sedang masuk. Data keuangan, audit, dan
        pengaturan internal Admin tidak pernah dikirim ke perangkat pasien.
      </section>

      <button
        type="button"
        onClick={logout}
        className="tactile flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--pp-hairline)] bg-[var(--pp-elevated)] py-3 text-xs font-semibold text-rose-500"
      >
        <LogOut className="h-4 w-4" />
        Keluar Akun
      </button>

      {installSheet ? (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Tutup panduan pasang"
            onClick={() => setInstallSheet(false)}
            className="absolute inset-0"
          />
          <div className="pp-sheet-safe relative w-full max-w-[480px] space-y-4 rounded-t-[30px] border-t border-[var(--pp-hairline)] bg-[var(--pp-elevated)] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--pp-accent)]">
                  Instalasi PWA
                </p>
                <h3 className="font-editorial text-2xl font-semibold text-[var(--pp-text)]">
                  Pasang Salsa Dental
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInstallSheet(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--pp-hairline)] bg-[var(--pp-soft)] text-[var(--pp-text)]"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-[var(--pp-secondary)]">
              <p>
                <strong className="text-[var(--pp-text)]">iPhone (Safari):</strong> ketuk ikon{' '}
                <em>Share</em> di bilah bawah lalu pilih <em>Add to Home Screen</em>.
              </p>
              <p>
                <strong className="text-[var(--pp-text)]">Android (Chrome):</strong> ketuk menu titik tiga
                di kanan atas lalu pilih <em>Install App / Tambahkan ke Layar Utama</em>.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[var(--pp-soft)] px-3 py-2 text-[10px] text-[var(--pp-secondary)]">
              <Smartphone className="h-3.5 w-3.5 text-[var(--pp-accent)]" />
              Portal tetap ringan di Vercel — tanpa server tambahan.
            </div>
            <button
              type="button"
              onClick={() => setInstallSheet(false)}
              className="pp-accent-btn inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold"
            >
              <Download className="h-4 w-4" />
              Mengerti
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

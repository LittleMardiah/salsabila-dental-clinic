'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export default function AdminCredentialsPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Username atau password salah')
        return
      }
      toast.success('Login berhasil')

      window.location.href = '/admin/queue'
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-header">
        <div className="flex items-center w-full px-8 h-20 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-tight text-primary-container">Salsa Dental</span>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center py-20 px-6 bg-surface-container-low relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-fixed/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary-fixed/10 rounded-full blur-3xl"></div>

        <div className="w-full z-10 max-w-2xl py-12">
          <div className="bg-surface-container-lowest rounded-2xl p-12 md:p-20 flex flex-col gap-12 transition-all duration-300 card-3d">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-primary-fixed flex items-center justify-center rounded-full mx-auto mb-6">
                <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
              </div>
              <div className="space-y-3">
                <h1 className="font-bold text-on-surface tracking-tight text-5xl">Selamat Datang</h1>
                <p className="text-on-surface-variant text-base font-body max-w-sm mx-auto">Silakan login untuk mengakses dashboard Salsa Dental Clinic.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Username Field */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-on-surface-variant font-label ml-2">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-on-surface-variant group-focus-within:text-primary transition-colors">person</span>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-14 pr-5 py-5 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest transition-all duration-300 placeholder:text-outline/50 text-on-surface outline-none text-lg input-inset"
                    placeholder="Masukkan username"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                  <label className="block text-sm font-semibold text-on-surface-variant font-label">Password</label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-on-surface-variant group-focus-within:text-primary transition-colors">key</span>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-14 pr-5 py-5 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest transition-all duration-300 placeholder:text-outline/50 text-on-surface outline-none text-lg input-inset"
                    placeholder="Masukkan password"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 space-y-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full text-white font-bold tracking-widest text-base uppercase shadow-xl hover:shadow-primary-fixed/50 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 py-6 btn-gradient-3d disabled:opacity-70"
                >
                  {loading ? 'Memproses...' : 'MASUK'}
                </button>
                <div className="text-center">
                  <a href="#" className="text-sm font-medium text-primary hover:text-on-primary-fixed-variant transition-colors underline-offset-4 hover:underline">
                    Lupa Password?
                  </a>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Decorative Icons */}
        <div className="absolute -bottom-12 -left-12 opacity-[0.03] rotate-12 pointer-events-none select-none z-0">
          <span className="material-symbols-outlined text-[320px] text-primary">dentistry</span>
        </div>
        <div className="absolute -bottom-16 -right-16 opacity-[0.03] -rotate-12 pointer-events-none select-none z-0">
          <span className="material-symbols-outlined text-[360px] text-primary">medical_services</span>
        </div>
      </main>
    </div>
  )
}
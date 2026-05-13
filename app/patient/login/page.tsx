'use client'

import { useState } from 'react'
import { Loader2, Lock, Shield } from 'lucide-react'
import { toast } from 'sonner'

export default function PatientLogin() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/patient/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login gagal')
        toast.error(data.error || 'Login gagal')
        return
      }

      toast.success('Login berhasil, mengarahkan...')
      window.location.href = '/patient/queue'
    } catch (err) {
      setError('Terjadi kesalahan, coba lagi')
      toast.error('Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fff8f7] flex flex-col items-center">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md shadow-sm h-20">
        <div className="flex justify-between items-center w-full px-8 h-full max-w-7xl mx-auto">
          <div className="text-2xl font-bold tracking-tight text-[#dca1a1] font-['Poppins',sans-serif]">
            Salsa Dental
          </div>
        </div>
      </nav>

      <main className="flex-grow flex items-center justify-center w-full px-6 pt-24 pb-24">
        <div className="w-full max-w-lg text-center space-y-12">
          {/* Lock Icon */}
          <div className="relative inline-block">
            <div className="w-36 h-36 bg-[#FEECEC] rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-12 h-12 text-[#815152]" strokeWidth={1.5} />
            </div>
          </div>

          {/* Typography Header */}
          <div className="space-y-4">
            <h1 className="font-['Poppins',sans-serif] text-4xl md:text-5xl font-bold text-[#1e1b1b] tracking-tight">
              Masukkan Kode Antrian
            </h1>
            <p className="text-[#514443] font-medium text-lg max-w-sm mx-auto leading-relaxed">
              Gunakan 6 digit yang Anda terima dari klinik saat melakukan pendaftaran
            </p>
          </div>

          {/* Input Section */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="relative group">
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="A1B2C3"
                className="w-full px-8 py-8 rounded-3xl bg-[#f9f2f2] border-none text-center text-3xl font-bold text-[#815152] placeholder:text-[#d5c2c1]/40 focus:ring-2 focus:ring-[#dca1a1] focus:bg-white transition-all duration-300 shadow-sm outline-none tracking-[8px]"
                required
              />
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-7 rounded-full bg-gradient-to-r from-[#dca1a1] to-[#815152] text-white font-['Poppins',sans-serif] font-bold text-xl tracking-widest hover:brightness-105 active:scale-95 transition-all duration-300 shadow-[0_8px_24px_-4px_rgba(129,81,82,0.2)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="inline mr-2 h-5 w-5 animate-spin" />
              ) : (
                'MASUK SEKARANG'
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-4 pt-12">
            <div className="h-[1px] w-12 bg-[#d5c2c1]/30"></div>
            <div className="flex items-center gap-2 px-8 py-3 bg-[#e8e1e1]/30 rounded-full border border-[#d5c2c1]/10">
              <Shield className="w-4 h-4 text-[#815152]" />
              <span className="text-xs font-bold text-[#514443] uppercase tracking-[0.15em]">
                Akses Terenkripsi & Dicatat
              </span>
            </div>
            <div className="h-[1px] w-12 bg-[#d5c2c1]/30"></div>
          </div>
        </div>
      </main>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function AdminCodePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 8) {
      toast.error('Kode harus 8 digit')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/admin/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Kode salah')
        return
      }
      toast.success('Kode valid')
      router.push('/admin/login/credentials')
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background font-body text-on-background overflow-hidden flex flex-col vault-backdrop">
      <div className="fixed top-8 left-8 z-[70]">
        <div className="text-2xl font-bold tracking-tight text-primary">Salsa Dental</div>
      </div>

      <main className="flex-grow flex items-center justify-center relative min-h-screen">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            className="w-full h-full object-cover grayscale opacity-5"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQIhXlRc3xv1oS1e8lXkCLoR3ALi6wTPKEpTZWcD9nAfmkDwbW7jdosPAXCwT0OHu89wrE8sFvoOa75WEqqgomrR9jzZ7S-o36eeOf50-T5moStp_sP3nnObydVL4glubmlauHOV40NtckVEjRWRvwFtoKLM-X6uh0cLk1iXU_Mpiv6j7Lhq2wXptPKDtYNJ2RTDlXtuTz9AR9VFDD3sZO9K3pfsHQV3_NMt97FFzaL5mz8lYp7AVLknFanjHc-x8ptbSQkHBm7sY"
            alt="background"
          />
        </div>

        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div className="w-full max-w-xl glass-card rounded-[3.5rem] p-12 md:p-16 shadow-premium relative overflow-hidden inner-glow">
            <div className="absolute top-0 right-0 p-12 opacity-[0.04] pointer-events-none translate-x-12 -translate-y-12">
              <span className="material-symbols-outlined text-[200px] text-primary">lock</span>
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-10 border border-white/50 shadow-lg">
                <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
              </div>
              <h1 className="font-headline text-3xl md:text-4xl font-bold text-on-surface mb-3 tracking-tight">Akses Admin Terbatas</h1>
              <p className="text-on-surface-variant font-medium mb-12 tracking-[0.2em] text-xs md:text-sm uppercase opacity-80">Masukkan Kode Vault</p>
              <form onSubmit={handleSubmit} className="w-full space-y-10">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-primary/30 rounded-[2.5rem] blur opacity-25 group-focus-within:opacity-50 transition duration-1000 group-focus-within:duration-200"></div>
                  <input
                    type="password"
                    maxLength={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="relative w-full bg-white/60 backdrop-blur-md border-2 border-primary/10 rounded-[2rem] py-8 px-4 text-center text-3xl md:text-4xl tracking-[0.6em] md:tracking-[0.8em] font-mono text-primary placeholder:text-primary/10 focus:ring-4 focus:ring-primary/10 focus:border-primary/40 transition-all duration-300 outline-none shadow-inner"
                    placeholder="••••••••"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-[2rem] py-7 font-headline font-bold transition-all duration-500 active:scale-[0.98] shadow-lg shadow-primary/20 disabled:opacity-70"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#DCA1A1] via-[#E8BDBD] to-[#DCA1A1] bg-[length:200%_100%] animate-[gradient_3s_linear_infinite] group-hover:bg-right transition-all duration-500"></div>
                  <span className="relative text-white tracking-widest text-xl uppercase">
                    {loading ? 'Memproses...' : 'BUKA'}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
// app/page.tsx
'use client'

import { useRef, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function Home() {
  // ✅ PERBAIKAN: gunakan useRef agar tidak re-render setiap klik
  const clickCountRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleFaqClick = useCallback(() => {
    clickCountRef.current += 1

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      clickCountRef.current = 0
    }, 1000)

    if (clickCountRef.current === 5) {
      clickCountRef.current = 0
      toast.success('Akses admin dibuka')
      // ✅ PERBAIKAN: gunakan window.location untuk navigasi pasti
      window.location.href = '/admin/login'
    }
  }, [])

  return (
    <div className="bg-background text-on-background selection:bg-primary-fixed selection:text-on-primary-fixed">
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-lg shadow-ambient">
        <div className="flex justify-between items-center w-full px-8 h-20 max-w-7xl mx-auto">
          <div className="text-2xl font-bold tracking-tight text-rose-500">Salsa Dental</div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-stone-600 font-medium hover:text-rose-400">About</a>
            <a href="#" className="text-stone-600 font-medium hover:text-rose-400">Services</a>
            <a href="#" className="text-stone-600 font-medium hover:text-rose-400">Testimonials</a>
            {/* ✅ PERBAIKAN: FAQ sebagai hidden trigger, tidak menampilkan angka */}
            <button
              onClick={handleFaqClick}
              className="text-stone-600 font-medium hover:text-rose-400 transition-all"
            >
              FAQ
            </button>
          </div>
          <Link href="/patient/login">
            <button className="bg-gradient-to-r from-[#dca1a1] to-[#663a3b] text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:scale-105 transition-transform">
              Ambil Antrian Sekarang
            </button>
          </Link>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[870px] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQeNW-U8hS8WTCy0fp7UsHLOwWK_1eHUqvz-ZbblR3NVCpE18fdKDguJd6FTVPE-P2mObzncX6TTjx-l7J4nHg0Op8HtKGLnHXTIXPefWvVDmq8mJ2ft0gAxrQwOQX7m4-NnirgQIQ0xKUb225xOZ9f4XHSaJzw2l8VOL6MD9KzlIkezCRA51Wg_XPky9XBkLdhG2qLV_aseiwlvxWqoYFMQrAhvTkEW0YIyYjTxwMN1foVN_UC3Vwf1P-q5sO9tBORNBXDkNUfF8"
              alt="Dental clinic interior"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/80 to-transparent"></div>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8 max-w-xl">
              <span className="inline-block px-4 py-1.5 bg-primary-fixed text-on-primary-fixed-variant rounded-full text-sm font-bold tracking-wide uppercase">
                Premium Dental Experience
              </span>
              <h1 className="text-5xl md:text-6xl font-bold text-on-surface leading-[1.1] tracking-tight">
                Senyum Sehat untuk Seluruh Keluarga
              </h1>
              <p className="text-lg text-on-surface-variant leading-relaxed">
                Nikmati perawatan gigi dengan standar medis tertinggi dalam suasana yang tenang dan nyaman.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <button className="bg-gradient-to-r from-[#dca1a1] to-[#663a3b] text-white px-8 py-4 rounded-full font-bold text-lg shadow-ambient hover:scale-[1.02] transition-transform">
                  Mulai Konsultasi
                </button>
                <button className="flex items-center gap-2 px-8 py-4 text-primary font-bold hover:bg-primary/5 rounded-full transition-colors">
                  <span className="material-symbols-outlined">play_circle</span>
                  Lihat Fasilitas
                </button>
              </div>
            </div>
            {/* Live Queue Widget */}
            <div className="flex flex-col justify-center items-end">
              <div className="relative bg-surface-container-lowest/90 backdrop-blur shadow-ambient rounded-3xl p-8 w-full max-w-sm border border-primary/5">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">Antrian Hari Ini</h3>
                    <p className="text-sm text-on-surface-variant">Update: Baru Saja</p>
                  </div>
                  <span className="p-3 bg-secondary-container text-on-secondary-container rounded-2xl">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
                  </span>
                </div>
                <div className="text-center py-6">
                  <h2 className="text-6xl font-bold text-primary mb-2 tracking-tighter">--</h2>
                  <p className="text-on-surface-variant font-medium">Menunggu Pasien...</p>
                </div>
                <div className="mt-4 p-4 bg-surface-container-low rounded-2xl flex items-center gap-3">
                  <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-widest">Klinik Beroperasi</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Layanan Unggulan (diringkas) */}
        <section className="py-24 bg-surface">
          <div className="max-w-7xl mx-auto px-8 text-center">
            <h2 className="text-4xl font-bold text-on-surface mb-16">Layanan Unggulan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {['Konsultasi', 'Scaling', 'Bleaching'].map((service, idx) => (
                <div key={idx} className="bg-surface-container-lowest p-8 rounded-3xl shadow-ambient">
                  <h3 className="text-2xl font-bold mb-2">{service}</h3>
                  <p className="text-on-surface-variant">Deskripsi layanan {service.toLowerCase()} berkualitas.</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer dengan hidden trigger FAQ (5 kali klik) */}
        <footer className="bg-stone-50 w-full py-16 px-8 mt-auto border-t border-rose-100/10">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <div className="text-xl font-bold text-rose-500">Salsa Dental Clinic</div>
              <p className="text-stone-500 mt-4">The Clinical Sanctuary Experience.</p>
            </div>
            <div>
              <h4 className="font-bold text-on-surface">Quick Links</h4>
              <ul className="mt-4 space-y-2">
                <li><a href="#" className="text-stone-500 hover:text-rose-500">About Us</a></li>
                <li><a href="#" className="text-stone-500 hover:text-rose-500">Our Services</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-on-surface">Newsletter</h4>
              <div className="flex gap-2 mt-4">
                <input type="email" placeholder="Email Anda" className="bg-white border rounded-full px-4 py-2 w-full" />
                <button className="bg-primary text-white px-4 rounded-full">Kirim</button>
              </div>
              <div className="pt-8">
                <button
                  onClick={handleFaqClick}
                  className="text-stone-400 text-sm hover:text-primary transition-colors opacity-40 hover:opacity-100"
                >
                  FAQ
                </button>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-stone-200 text-center text-stone-500 text-sm">
            © 2026 Salsa Dental Clinic. The Clinical Sanctuary Experience.
          </div>
        </footer>
      </main>
    </div>
  )
}
'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function Home() {
  // Hidden trigger untuk admin (klik FAQ 5x dalam 3 detik) -> redirect ke /admin/login
  const clickCountRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleFaqClick = () => {
    clickCountRef.current += 1

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      clickCountRef.current = 0
    }, 3000)

    if (clickCountRef.current === 5) {
      clickCountRef.current = 0
      toast.success('Akses admin dibuka')
      window.location.href = '/admin/login'
    }
  }

  useEffect(() => {
    const element = document.getElementById('faq-trigger')
    if (element) {
      element.addEventListener('click', handleFaqClick)
      return () => element.removeEventListener('click', handleFaqClick)
    }
  }, [])

  return (
    <div className="bg-background text-on-background selection:bg-primary-container selection:text-on-primary-container relative flex flex-col min-h-screen overflow-x-hidden">
      {/* Ambient Background Glows */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-tertiary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 glass-card border-b-0">
        <div className="flex justify-between items-center w-full px-8 h-24 max-w-7xl mx-auto">
          <div className="text-2xl font-extrabold tracking-tight text-primary">Salsa Dental</div>
        </div>
      </nav>

      <main className="pt-24 flex-grow flex items-center justify-center">
        <div className="perspective-container p-8 w-full max-w-2xl flex flex-col items-center justify-center text-center">
          <Link href="/patient/login" className="block w-full max-w-lg">
            <button className="bg-gradient-to-r from-[#dca1a1] to-[#815152] text-white px-16 py-8 rounded-full font-extrabold text-3xl shadow-3d-floating transition-all hover:-translate-y-2 hover:scale-105 active:translate-y-0 relative overflow-hidden group w-full">
              <span className="relative z-10">Ambil Antrian Sekarang</span>
              <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]"></span>
            </button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-card bg-surface/50 border-t border-white w-full py-20 px-8 mt-auto backdrop-blur-2xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 max-w-7xl mx-auto">
          <div className="md:col-span-5 space-y-8">
            <div className="text-3xl font-extrabold text-primary">Salsa Dental Clinic</div>
            <p className="text-on-surface-variant text-lg font-medium leading-relaxed pr-8">
              The Clinical Sanctuary Experience. Memberikan standar kenyamanan baru dalam perawatan gigi profesional.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-12 h-12 rounded-full glass-card bg-surface flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors shadow-sm">
                <span className="material-symbols-outlined text-xl">public</span>
              </a>
              <a href="#" className="w-12 h-12 rounded-full glass-card bg-surface flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors shadow-sm">
                <span className="material-symbols-outlined text-xl">share</span>
              </a>
            </div>
          </div>
          <div className="md:col-span-3 space-y-8">
            <h4 className="font-extrabold text-xl text-on-surface">Quick Links</h4>
            <ul className="space-y-5">
              <li>
                {/* Hidden trigger: teks "FAQ" yang bisa diklik 5 kali */}
                <button
                  id="faq-trigger"
                  className="text-on-surface-variant font-medium hover:text-primary transition-colors text-lg"
                >
                  FAQ
                </button>
              </li>
              <li><a href="#" className="text-on-surface-variant font-medium hover:text-primary transition-colors text-lg">Our Services</a></li>
              <li><a href="#" className="text-on-surface-variant font-medium hover:text-primary transition-colors text-lg">Privacy Policy</a></li>
            </ul>
          </div>
          <div className="md:col-span-4 space-y-8">
            <h4 className="font-extrabold text-xl text-on-surface">Newsletter</h4>
            <p className="text-on-surface-variant font-medium text-lg">Dapatkan tips kesehatan gigi dan promo menarik setiap bulan.</p>
            <div className="flex gap-3 glass-card p-2 rounded-full bg-surface border-white shadow-sm">
              <input
                className="bg-transparent border-none px-6 py-3 w-full focus:ring-0 text-on-surface font-medium placeholder-on-surface-variant/50"
                placeholder="Email Anda"
                type="email"
              />
              <button className="bg-primary text-white rounded-full px-8 py-3 font-bold hover:shadow-lg transition-shadow">
                Kirim
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-primary/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-on-surface-variant font-medium text-base">© 2026 Salsa Dental Clinic. The Clinical Sanctuary Experience.</p>
          <div className="flex gap-8 text-base font-medium text-on-surface-variant">
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Cookie Policy</a>
          </div>
        </div>
      </footer>

      {/* FAB WhatsApp */}
      <a href="#" className="fixed bottom-8 right-8 z-[100] group perspective-container">
        <div className="flex items-center gap-3 bg-primary text-white px-8 py-5 rounded-full shadow-float backdrop-blur-md bg-opacity-90 border border-white/20 transition-transform hover:scale-105">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
          <span className="font-bold text-lg hidden md:inline">Butuh Bantuan?</span>
        </div>
      </a>

      {/* Style tambahan untuk animasi dan efek (jika tidak ada di tailwind config) */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .shadow-3d-floating {
          box-shadow: 0 20px 40px -10px rgba(129, 81, 82, 0.15), 0 10px 20px -5px rgba(129, 81, 82, 0.1), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.02);
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 10px 35px -5px rgba(129, 81, 82, 0.06);
        }
        .perspective-container {
          perspective: 1000px;
        }
      `}</style>
    </div>
  )
}
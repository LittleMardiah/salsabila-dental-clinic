'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button'; 
import { Card, CardContent } from '@/components/ui/card';
import { AdminLoginModal } from '@/components/AdminLoginModal';

export default function Home() {
  // Hidden trigger state
  const [clickCount, setClickCount] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  // Deteksi klik pada logo sebanyak 5x dalam 3 detik
  const handleLogoClick = () => {
    setClickCount((prev) => prev + 1);
    if (clickTimeout.current) clearTimeout(clickTimeout.current);
    clickTimeout.current = setTimeout(() => setClickCount(0), 3000);
  };

  useEffect(() => {
    if (clickCount === 5) {
      setShowAdminModal(true);
      setClickCount(0);
    }
  }, [clickCount]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b py-4 px-6 bg-white shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div 
            onClick={handleLogoClick} 
            className="cursor-pointer text-2xl font-bold text-primary"
          >
            Salsabila Dental Clinic
          </div>
          <Link href="/patient/login">
            <Button variant="outline" className="border-primary text-primary">
              Cek Antrian
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-6 text-center bg-gradient-to-br from-primary/10 to-secondary/20">
        <div className="container mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
            Senyuman Sehat, Mulai dari Sini
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Layanan dental profesional dengan teknologi antrian digital dan rekam medis elektronik. 
            Cepat, nyaman, dan aman.
          </p>
          <Link href="/patient/login">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Cek Antrian Sekarang
            </Button>
          </Link>
        </div>
      </section>

      {/* Layanan Unggulan */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Layanan Kami</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <h3 className="font-bold text-xl mb-2">Digital Queue</h3>
                <p className="text-gray-600">Pantau antrian real-time via HP, dapatkan notifikasi saat giliran tiba.</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <h3 className="font-bold text-xl mb-2">EMR Digital</h3>
                <p className="text-gray-600">Rekam medis elektronik dengan foto, riwayat lengkap, dan follow-up.</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <h3 className="font-bold text-xl mb-2">Laporan Keuangan</h3>
                <p className="text-gray-600">Rekonsiliasi otomatis, laporan harian/bulanan akurat.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimoni */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Apa Kata Pasien?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardContent className="pt-6">
                <p className="italic">"Gak perlu nunggu lama lagi, notifikasi di HP beneran bunyi pas giliran saya. Kliniknya juga bersih dan dokternya ramah!"</p>
                <p className="font-bold mt-4">- Budi, 28 tahun</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="italic">"Sistem antriannya gampang banget, saya yang gaptek juga bisa. Adminnya bantuin daftarin, nanti dipanggil lisan."</p>
                <p className="font-bold mt-4">- Siti, 68 tahun</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 px-6">
        <div className="container mx-auto text-center">
          <p>&copy; 2026 Salsabila Dental Clinic. All rights reserved.</p>
          <p className="text-sm text-gray-400 mt-2">Jl. Contoh No. 123, Kota Contoh | Telp: (021) 1234567</p>
        </div>
      </footer>

      {/* Modal Admin (dua lapis) - akan kita buat di bagian B */}
      <AdminLoginModal open={showAdminModal} onClose={() => setShowAdminModal(false)} />
    </div>
  );
}
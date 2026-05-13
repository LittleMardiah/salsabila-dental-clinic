'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function NotificationHelpModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
        onClick={() => setOpen(true)}
      >
        ❓ Solusi Izin Notifikasi Tidak Diizinkan
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white border-rose-100 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-rose-800">⚠️ Izin Notifikasi Tidak Diizinkan</DialogTitle>
            <DialogDescription className="text-stone-600">
              Untuk menerima notifikasi panggilan antrian, ikuti langkah berikut:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-stone-700">
            <div>
              <h4 className="font-semibold text-rose-700">📱 Android (Chrome, Firefox, Edge)</h4>
              <ol className="list-decimal list-inside space-y-1 mt-1 ml-2">
                <li>Buka <strong>Pengaturan</strong> HP → <strong>Aplikasi</strong> → <strong>Chrome</strong> (atau browser Anda).</li>
                <li>Pilih <strong>Notifikasi</strong> → hidupkan <strong>Izinkan notifikasi</strong>.</li>
                <li>Kembali ke halaman ini, <strong>refresh</strong>, lalu tekan tombol <strong>Aktifkan Notifikasi</strong> lagi.</li>
                <li>Jika masih tidak muncul: di browser, tekan ikon <strong>🔒</strong> di samping URL → <strong>Izin</strong> → <strong>Notifikasi</strong> → ubah ke <strong>Izinkan</strong>.</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-rose-700">🍎 iOS (iPhone / iPad)</h4>
              <ol className="list-decimal list-inside space-y-1 mt-1 ml-2">
                <li>Buka <strong>Pengaturan</strong> → <strong>Safari</strong> → <strong>Notifikasi</strong> → pastikan <strong>Izinkan Notifikasi</strong> aktif.</li>
                <li>Buka halaman ini di Safari (bukan browser lain).</li>
                <li>Tekan tombol <strong>Bagikan</strong> (kotak dengan panah) → pilih <strong>Tambahkan ke Layar Utama</strong>.</li>
                <li>Buka aplikasi dari layar utama, lalu izinkan notifikasi saat diminta.</li>
                <li className="text-xs text-stone-500">Catatan: Web push di iOS hanya berfungsi jika situs ditambahkan ke layar utama.</li>
              </ol>
            </div>
            <div className="pt-2 text-center">
              <button
                onClick={() => {
                  setOpen(false)
                  window.location.reload()
                }}
                className="text-rose-600 underline hover:text-rose-700"
              >
                Refresh halaman sekarang
              </button>
              <p className="text-xs text-stone-500 mt-1">Setelah mengikuti langkah di atas</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
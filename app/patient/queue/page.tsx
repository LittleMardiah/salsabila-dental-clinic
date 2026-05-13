'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Volume2, MessageCircle, X, Clock, Users, Tv, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { NotificationHelpModal } from '@/components/NotificationHelpModal'

export default function PatientQueuePage() {
  const [loading, setLoading] = useState(true)
  const [boardData, setBoardData] = useState<any>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [queueId, setQueueId] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkExistingSubscription = async () => {
      if ('serviceWorker' in navigator && queueId) {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          setIsSubscribed(true)
        }
      }
    }
    checkExistingSubscription()
  }, [queueId])

  const fetchBoard = async () => {
    try {
      const res = await fetch('/api/queue/board')
      if (res.ok) {
        const data = await res.json()
        setBoardData(data)
        if (data.queueId) setQueueId(data.queueId)
        return
      }
      if (res.status === 401) router.push('/patient/login')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    const init = async () => {
      await fetchBoard()
      interval = setInterval(fetchBoard, 5000)
    }
    init()
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered', reg))
        .catch(err => console.error('SW registration failed:', err))
    }
  }, [])

  const enableNotifications = async () => {
    console.log('enableNotifications called, queueId:', queueId)
    if (!queueId) {
      toast.error('Error', { description: 'Data antrian tidak ditemukan. Silakan refresh halaman.' })
      return
    }
    if (!('Notification' in window)) {
      toast.error('Notifikasi tidak didukung', { description: 'Browser Anda tidak mendukung notifikasi' })
      return
    }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      toast.error('Izin ditolak', { description: 'Klik tombol bantuan untuk panduan' })
      return
    }
    const registration = await navigator.serviceWorker.ready
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      toast.error('Konfigurasi error', { description: 'VAPID key tidak ditemukan' })
      return
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    })
    const res = await fetch('/api/webpush/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, queueId }),
    })
    if (res.ok) {
      setIsSubscribed(true)
      toast.success('Notifikasi aktif')
    } else {
      const errData = await res.json()
      toast.error(errData.error || 'Gagal mengaktifkan notifikasi')
    }
  }

  const cancelQueue = async () => {
    if (!queueId) return
    if (confirm('Apakah Anda yakin ingin membatalkan antrian? Tindakan ini tidak dapat dibatalkan.')) {
      toast.info('Fitur pembatalan antrian sedang dalam pengembangan')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fff8f7]">Memuat...</div>
  }

  if (!boardData) return null

  const { myQueue, currentCalled, nextQueues, totalToday } = boardData

  const myNumber = myQueue.number
  const position = myQueue.position
  const currentNumber = currentCalled?.number || null
  const currentPatient = currentCalled?.patientNameMasked || ''
  const total = totalToday

  return (
    <div className="min-h-screen bg-[#fff8f7]">
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md shadow-sm h-20">
        <div className="flex justify-between items-center w-full px-8 h-full max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <span className="text-2xl font-bold tracking-tight text-[#815152] transition-all duration-300">
              Salsa Dental
            </span>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-32 pb-24 px-6 max-w-7xl mx-auto w-full">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white p-12 rounded-[3rem] shadow-ambient text-center lg:text-left border border-[#e8e1e1]/30">
              <span className="inline-flex items-center px-6 py-2 rounded-full bg-[#eee6e6] text-[#514443] font-bold text-sm tracking-widest mb-8">
                ⏳ MENUNGGU
              </span>
              <h1 className="text-[#514443] text-xl font-medium mb-4">Nomor Antrian Anda</h1>
              <div className="text-[7rem] md:text-[9rem] font-bold text-[#dca1a1] leading-none tracking-tighter mb-10">
                {myNumber}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-[#e8e1e1]/50 pt-10">
                <div className="flex items-center gap-5 p-6 rounded-3xl bg-[#f9f2f2] border border-[#e8e1e1]/20">
                  <div className="bg-white p-3 rounded-2xl">
                    <Users className="text-[#815152] w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-[#514443] mb-1">Posisi Anda</p>
                    <p className="text-xl font-bold text-[#1e1b1b]">Ke-{position} dalam antrian</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={enableNotifications}
                disabled={isSubscribed}
                className="flex-1 flex items-center justify-center gap-3 px-8 py-5 rounded-full bg-gradient-to-r from-[#dca1a1] to-[#663a3b] text-white font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-xl shadow-[#815152]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Volume2 className="w-6 h-6" />
                <span className="text-base">{isSubscribed ? 'Notifikasi Aktif' : 'Aktifkan Suara Panggilan'}</span>
              </button>
              <a
                href="https://wa.me/6281234567890"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-3 px-8 py-5 rounded-full bg-[#006d2f] text-white font-bold transition-all duration-300 hover:bg-[#007232] hover:scale-[1.02] active:scale-95 shadow-xl shadow-[#006d2f]/20"
              >
                <MessageCircle className="w-6 h-6" />
                <span className="text-base">WhatsApp Clinic</span>
              </a>
            </div>

            <button
              onClick={cancelQueue}
              className="w-full py-5 text-[#ba1a1a] font-bold text-base hover:bg-[#ffdad6]/20 rounded-full transition-colors border border-[#ba1a1a]/20"
            >
              ❌ Batalkan Antrian
            </button>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5">
            <div className="bg-[#f4ecec] p-10 rounded-[3rem] h-full border border-[#e8e1e1]/30">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-bold text-[#815152]">Papan Antrian Klinis</h2>
                <Tv className="text-[#dca1a1] w-8 h-8" />
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-md mb-8 border-l-[6px] border-[#006d2f]">
                <p className="text-xs uppercase tracking-widest text-[#006d2f] font-bold mb-4">Sedang Dilayani</p>
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-bold text-[#1e1b1b]">{currentNumber || '—'}</span>
                  <span className="text-[#514443] text-lg font-medium">{currentPatient || 'Belum ada'}</span>
                </div>
              </div>

              <div className="space-y-5">
                <p className="text-sm font-bold text-[#514443]/70 uppercase tracking-widest pl-2">Antri berikutnya</p>
                {nextQueues && nextQueues.length > 0 ? (
                  nextQueues.map((q: any, idx: number) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-6 rounded-[2rem] border ${
                        q.isMe
                          ? 'bg-[#ffdad9] border-[#815152]/20 shadow-sm'
                          : 'bg-white/50 border-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                            q.isMe
                              ? 'bg-[#815152] text-white'
                              : 'bg-[#eee6e6] text-[#1e1b1b]'
                          }`}
                        >
                          {q.number.split('-')[1]}
                        </div>
                        <div>
                          <p className="text-lg font-medium text-[#1e1b1b]">{q.patientNameMasked}</p>
                          {q.isMe && (
                            <p className="text-xs text-[#815152] font-medium">Pasien Selanjutnya</p>
                          )}
                        </div>
                      </div>
                      {q.isMe && <ArrowRight className="text-[#815152] w-6 h-6" />}
                    </div>
                  ))
                ) : (
                  <p className="text-[#514443] text-center py-4">Tidak ada antrian berikutnya</p>
                )}

                <div className="p-6 border-t border-[#e8e1e1]/40 mt-8">
                  <div className="flex justify-between text-sm text-[#514443] font-semibold">
                    <span>Total Antrian Hari Ini</span>
                    <span>{total} Pasien</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!isSubscribed && (
          <div className="max-w-md mx-auto mt-8">
            <NotificationHelpModal />
          </div>
        )}
      </main>
    </div>
  )
}
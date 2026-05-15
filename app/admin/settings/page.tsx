// app/admin/settings/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Daftar menu yang tersedia untuk disembunyikan (tanpa Settings sendiri)
const MENUS = [
  { key: 'Dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'Queue', label: 'Antrian', icon: 'group' },
  { key: 'EMR', label: 'EMR', icon: 'medical_services' },
  { key: 'Finance', label: 'Keuangan', icon: 'payments' },
  { key: 'AuditLog', label: 'Audit Log', icon: 'history_edu' },
]

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [hiddenMenus, setHiddenMenus] = useState<string[]>([])
  const [isGoogleConnected, setIsGoogleConnected] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // --- Preferensi Menu ---
  const { data, isLoading, error } = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const res = await fetch('/api/preferences')
      if (!res.ok) throw new Error('Gagal mengambil preferensi')
      return res.json()
    },
  })

  useEffect(() => {
    if (data?.hiddenMenus) setHiddenMenus(data.hiddenMenus)
    if (data?.googleAccessToken) setIsGoogleConnected(!!data.googleAccessToken)
  }, [data])

  const updateMutation = useMutation({
    mutationFn: async (hidden: string[]) => {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiddenMenus: hidden }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menyimpan preferensi')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Preferensi disimpan')
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
      window.dispatchEvent(new Event('preferences-updated'))
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const handleToggle = (menuKey: string) => {
    setHiddenMenus(prev =>
      prev.includes(menuKey) ? prev.filter(k => k !== menuKey) : [...prev, menuKey]
    )
  }

  const handleSavePreferences = () => {
    updateMutation.mutate(hiddenMenus)
  }

  // --- Backup ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('connected') === 'true') {
      toast.success('Google Drive terhubung')
      setIsGoogleConnected(true)
      window.history.replaceState({}, '', '/admin/settings')
    }
    if (urlParams.get('error')) toast.error('Gagal menghubungkan Google Drive')
  }, [])

  const downloadLocalBackup = async () => {
    try {
      const res = await fetch('/api/backup/local')
      if (!res.ok) throw new Error('Gagal membuat backup')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Backup lokal berhasil diunduh')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const connectGoogleDrive = () => {
    window.location.href = '/api/backup/google-auth'
  }

  const uploadToDrive = async () => {
    setIsUploading(true)
    try {
      const res = await fetch('/api/backup/cloud', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload gagal')
      toast.success(`Backup berhasil diupload ke Google Drive: ${data.fileName}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const disconnectGoogleDrive = async () => {
    try {
      const res = await fetch('/api/backup/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Gagal memutuskan akses')
      toast.success('Akses Google Drive dicabut')
      setIsGoogleConnected(false)
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (isLoading) return <div className="p-6 text-center">Loading...</div>
  if (error) return <div className="p-6 text-red-500">Error: {error.message}</div>

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-headline font-extrabold text-primary mb-2">Pengaturan</h1>
        <p className="text-body-md text-on-surface-variant max-w-2xl">
          Konfigurasi pengalaman klinis dengan mengelola visibilitas modul dan pastikan integritas data melalui sistem pencadangan otomatis.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Preferensi Tampilan Menu */}
        <section className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="silk-card rounded-3xl p-8 border border-white/50 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-primary-container/20 rounded-2xl text-primary">
                <span className="material-symbols-outlined">visibility</span>
              </div>
              <h2 className="text-xl font-headline font-bold text-on-primary-fixed-variant">Preferensi Tampilan Menu</h2>
            </div>
            <div className="space-y-4">
              {MENUS.map(menu => (
                <label
                  key={menu.key}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/40 hover:bg-white/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
                      {menu.icon}
                    </span>
                    <span className="font-body font-medium">{menu.label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hiddenMenus.includes(menu.key)}
                    onChange={() => handleToggle(menu.key)}
                    className="w-6 h-6 rounded-lg border-outline-variant text-primary focus:ring-primary/20 cursor-pointer"
                  />
                </label>
              ))}
              {/* Menu Settings selalu tidak bisa disembunyikan */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 opacity-60 border border-primary/10">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-primary">settings</span>
                  <span className="font-body font-medium text-primary">Pengaturan</span>
                </div>
                <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              </div>
            </div>
            <button
              onClick={handleSavePreferences}
              disabled={updateMutation.isPending}
              className="mt-8 w-full py-4 bg-gradient-to-br from-primary to-on-primary-container text-white font-headline font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </section>

        {/* Backup Data */}
        <section className="col-span-12 lg:col-span-7 flex flex-col gap-8">
          <div className="flex items-center gap-3 px-2">
            <div className="p-3 bg-tertiary-container/20 rounded-2xl text-tertiary">
              <span className="material-symbols-outlined">cloud_sync</span>
            </div>
            <h2 className="text-xl font-headline font-bold text-on-primary-fixed-variant">Backup Data</h2>
          </div>

          {/* Local Backup Module */}
          <div className="silk-card rounded-3xl p-8 border border-white/50 flex items-center gap-8 relative overflow-hidden group">
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-tertiary/5 rounded-full blur-3xl"></div>
            <div className="w-32 h-32 flex-shrink-0 bg-white/40 rounded-3xl border border-white/60 shadow-inner flex items-center justify-center relative">
              <span className="material-symbols-outlined text-5xl text-primary/40 group-hover:scale-110 transition-transform">folder_zip</span>
              <div className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">Local</div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-headline font-bold text-on-surface mb-2">Arsip Data Klinik (ZIP)</h3>
              <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                Unduh salinan lengkap basis data pasien, rekam medis, dan laporan keuangan dalam format terenkripsi yang aman.
              </p>
              <button
                onClick={downloadLocalBackup}
                className="px-6 py-3 bg-white border border-outline-variant/30 text-primary font-headline font-bold rounded-xl shadow-sm hover:shadow-md hover:bg-surface-container-low transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                Unduh ZIP Sekarang
              </button>
            </div>
          </div>

          {/* Cloud Sync Module */}
          <div className="silk-card rounded-3xl p-8 border border-white/50 relative overflow-hidden group">
            <div className="flex items-start justify-between mb-8">
              <div className="flex gap-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuABFCtcVUAMenwB4wUMYjCxH0b_y_RkCyf5FjM8tuomMXM1OYY7dXABSUWy2HJEp82wjgqk1yLZw0tUJcThCHBxY3bZ827wmXQ8e02C2GeXl0hQunVt_J9lMyLq0F4CHR8Ozy4oZ5VpcfovODVu-a_w4CM6uT9DJB9cxgkKzFXkOvel1t8qgQLDM9nkyZ_FqpkOkxT7Hfb5X1p1xEMwYojJNyVJIVQoTnCy4BcXRHv6aRuRv6k8awpWs2gYbxuCLeH5PXAW98CGFug"
                    alt="Sync Icon"
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-headline font-bold text-on-surface">Sinkronisasi Google Drive</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${isGoogleConnected ? 'bg-secondary animate-pulse' : 'bg-error'}`}></div>
                    <span className={`${isGoogleConnected ? 'text-secondary' : 'text-error'} font-bold text-xs uppercase tracking-widest`}>
                      {isGoogleConnected ? 'Connected & Syncing' : 'Not Connected'}
                    </span>
                  </div>
                </div>
              </div>
              {isGoogleConnected && (
                <div className="px-2 py-0.5 bg-secondary/5 rounded-full flex items-center gap-1 border border-secondary/10">
                  <span className="material-symbols-outlined text-secondary text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="text-secondary text-[10px] font-bold">Terverifikasi</span>
                </div>
              )}
            </div>

            {isGoogleConnected && (
              <div className="bg-surface-container-low/50 rounded-2xl p-6 border border-white/50 mb-8">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mb-1">Status Penyimpanan</p>
                    <p className="text-xl font-headline font-extrabold text-primary">12.4 GB <span className="text-sm font-medium text-on-surface-variant">/ 15 GB</span></p>
                  </div>
                  <p className="text-xs text-on-surface-variant italic">Terakhir sinkron: 2 menit yang lalu</p>
                </div>
                <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-white/20">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary w-[82%] rounded-full"></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {!isGoogleConnected ? (
                <button
                  onClick={connectGoogleDrive}
                  className="col-span-2 py-3 px-4 bg-white/60 hover:bg-white border border-outline-variant/20 rounded-xl font-headline font-bold text-on-surface-variant text-sm transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">cloud_queue</span>
                  Hubungkan Google Drive
                </button>
              ) : (
                <>
                  <button
                    onClick={uploadToDrive}
                    disabled={isUploading}
                    className="py-3 px-4 bg-white/60 hover:bg-white border border-outline-variant/20 rounded-xl font-headline font-bold text-on-surface-variant text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">settings_backup_restore</span>
                    {isUploading ? 'Mengupload...' : 'Backup'}
                  </button>
                  <button
                    onClick={disconnectGoogleDrive}
                    className="py-3 px-4 bg-white/60 hover:bg-white border border-outline-variant/20 rounded-xl font-headline font-bold text-error/70 text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">link_off</span>
                    Putuskan Akses
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
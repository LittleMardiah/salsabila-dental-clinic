'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X, LogOut } from 'lucide-react'
import { toast } from 'sonner'

const ALL_MENU_ITEMS = [
  { href: '/admin/queue', label: 'Antrian', icon: 'groups', key: 'Queue' },
  { href: '/admin/emr', label: 'EMR', icon: 'clinical_notes', key: 'EMR' },
  { href: '/admin/finance', label: 'Keuangan', icon: 'payments', key: 'Finance' },
  { href: '/admin/audit-log', label: 'Audit Log', icon: 'shield', key: 'AuditLog' },
  { href: '/admin/settings', label: 'Pengaturan', icon: 'settings', key: 'Settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [username, setUsername] = useState('Admin')
  const [menuItems, setMenuItems] = useState(ALL_MENU_ITEMS)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/credentials'

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await fetch('/api/auth/admin/check')
        if (res.ok) {
          const data = await res.json()
          setUsername(data.username || 'Admin')
        }
      } catch (error) {
        console.error('Failed to fetch admin data')
      }
    }
    if (!isLoginPage) fetchAdmin()
  }, [isLoginPage])

  // Fetch preferences and filter menu items
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const res = await fetch('/api/preferences')
        if (res.ok) {
          const data = await res.json()
          const hiddenMenus = data.hiddenMenus || []
          const filtered = ALL_MENU_ITEMS.filter(item => !hiddenMenus.includes(item.key))
          setMenuItems(filtered)
        }
      } catch (error) {
        console.error('Failed to fetch preferences', error)
      }
    }
    if (!isLoginPage) {
      fetchPreferences()
    }
  }, [isLoginPage])

  // Event listener untuk refresh sidebar
  useEffect(() => {
    const handleUpdate = () => {
      const refresh = async () => {
        const res = await fetch('/api/preferences')
        if (res.ok) {
          const data = await res.json()
          const hiddenMenus = data.hiddenMenus || []
          const filtered = ALL_MENU_ITEMS.filter(item => !hiddenMenus.includes(item.key))
          setMenuItems(filtered)
        }
      }
      refresh()
    }
    window.addEventListener('preferences-updated', handleUpdate)
    return () => window.removeEventListener('preferences-updated', handleUpdate)
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/admin/logout', { method: 'POST' })
      if (res.ok) {
        toast.success('Logout berhasil')
        window.location.href = '/'
      } else {
        toast.error('Gagal logout')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan')
    }
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  // Redirect jika masih ada yang akses /admin/dashboard ke /admin/queue
  if (pathname === '/admin/dashboard') {
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/queue'
    }
    return null
  }

  return (
    <div className="bg-[#fff8f7] text-[#1e1b1b] min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white/40 backdrop-blur-md border-r border-white/20 h-screen sticky top-0 flex-col p-6 gap-8 overflow-y-auto shadow-[10px_0px_30px_rgba(0,0,0,0.03)] z-20">
        <div className="flex items-center gap-3 px-2">
          <span className="text-2xl font-bold tracking-tight text-[#815152]">Salsa Dental</span>
        </div>
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-br from-[#dca1a1] to-[#815152]/30 text-[#1e1b1b] font-semibold shadow-[0_4px_12px_rgba(129,81,82,0.15)]'
                    : 'text-[#514443] hover:bg-white/60 hover:shadow-sm'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : 'icon-outline'}`}>
                  {item.icon}
                </span>
                <span className="font-label text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile drawer sidebar */}
      <>
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`fixed top-0 left-0 h-full w-72 bg-white/40 backdrop-blur-md border-r border-white/20 flex flex-col p-6 gap-8 overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between gap-3 px-2">
            <span className="text-2xl font-bold tracking-tight text-[#815152]">Salsa Dental</span>
            <button title="." onClick={() => setSidebarOpen(false)} className="p-2 rounded-full hover:bg-white/60 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-br from-[#dca1a1] to-[#815152]/30 text-[#1e1b1b] font-semibold shadow-[0_4px_12px_rgba(129,81,82,0.15)]'
                      : 'text-[#514443] hover:bg-white/60 hover:shadow-sm'
                  }`}
                >
                  <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : 'icon-outline'}`}>
                    {item.icon}
                  </span>
                  <span className="font-label text-sm">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>
      </>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white/70 backdrop-blur-lg sticky top-0 z-10 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button title="." onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-md hover:bg-white/60 transition-colors">
              <Menu className="w-5 h-5 text-[#514443]" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl font-headline font-bold text-[#1e1b1b]">Halo, {username}</h1>
              <p className="text-xs text-[#514443] hidden md:block">Selamat datang di Salsa Dental Clinic</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-all font-medium text-sm">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
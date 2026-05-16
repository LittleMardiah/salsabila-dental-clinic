'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  DollarSign,
  History,
  Database,
  Settings,
  X,
} from 'lucide-react';

const ALL_MENU_ITEMS = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, key: 'Dashboard' },
  { name: 'Antrian', href: '/admin/queue', icon: ClipboardList, key: 'Queue' },
  { name: 'EMR', href: '/admin/emr', icon: FileText, key: 'EMR' },
  { name: 'Finance', href: '/admin/finance', icon: DollarSign, key: 'Finance' },
  { name: 'Audit Log', href: '/admin/audit-log', icon: History, key: 'AuditLog' },
  { name: 'Backup', href: '/admin/backup', icon: Database, key: 'Backup' },
  { name: 'Preferences', href: '/admin/preferences', icon: Settings, key: 'Preferences' },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const { data, refetch } = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const res = await fetch('/api/preferences');
      if (!res.ok) throw new Error('Failed to fetch preferences');
      return res.json();
    },
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const handlePreferencesUpdate = () => {
      refetch();
    };
    window.addEventListener('preferences-updated', handlePreferencesUpdate);
    return () => window.removeEventListener('preferences-updated', handlePreferencesUpdate);
  }, [refetch]);

  const hiddenMenus = data?.hiddenMenus || [];
  const visibleMenus = ALL_MENU_ITEMS.filter(
    (item) => !hiddenMenus.includes(item.key)
  );

  // Sidebar content
  const sidebarContent = (
    <div className="flex flex-col h-full p-6 gap-2">
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="font-headline font-black text-xl text-primary block">Salsa Dental</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold opacity-60">
            The Clinical Sanctuary
          </span>
        </div>
        {/* Tombol close hanya muncul di mobile (dikontrol oleh parent layout) */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-full hover:bg-surface-container-high transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1">
        {visibleMenus.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-headline font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex bg-surface-container-low h-screen w-72 flex-col fixed left-0 top-0 z-50 shadow-lg">
        {sidebarContent}
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}
      <aside
        className={`
          fixed top-0 left-0 h-full w-72 bg-surface-container-low z-50 transform transition-transform duration-300 ease-in-out lg:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
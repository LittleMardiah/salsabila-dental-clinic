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

export function AdminSidebar() {
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

  // Event listener untuk refresh sidebar setelah preferensi diubah
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

  return (
    <aside className="bg-surface-container-low h-screen w-72 flex flex-col fixed left-0 top-0 z-50">
      <div className="flex flex-col h-full p-6 gap-2">
        <div className="mb-8 px-4">
          <span className="font-headline font-black text-xl text-primary block">Salsa Dental</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold opacity-60">
            The Clinical Sanctuary
          </span>
        </div>
        <nav className="flex-1 space-y-1">
          {visibleMenus.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
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
    </aside>
  );
}

export default AdminSidebar;
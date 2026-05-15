'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, FileText, DollarSign, Users, Settings } from 'lucide-react';

const menuItems = [
  { name: 'Antrian', href: '/admin/queue', icon: ClipboardList },
  { name: 'EMR', href: '/admin/emr', icon: FileText },
  { name: 'Finance', href: '/admin/finance', icon: DollarSign },
  { name: 'Pasien', href: '/admin/patients', icon: Users },
  { name: 'Pengaturan', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-surface-container-low h-screen w-72 flex flex-col fixed left-0 top-0 z-50">
      <div className="flex flex-col h-full p-6 gap-2">
        {/* Logo */}
        <div className="mb-8 px-4">
          <span className="font-headline font-black text-xl text-primary block">Salsa Dental</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold opacity-60">The Clinical Sanctuary</span>
        </div>

        {/* Menu */}
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
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
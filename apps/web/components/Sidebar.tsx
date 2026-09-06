'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUi } from '@/lib/ui';
import {
  LayoutDashboard,
  Mail,
  Calendar,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_MAP } from '@mailmind/shared/categories';

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen } = useUi();
  if (!sidebarOpen) return null;

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-5 border-b border-slate-100 flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-slate-900 text-white grid place-items-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <span className="font-semibold text-slate-900">MailMind</span>
      </div>
      <nav className="px-3 py-4 flex-1 overflow-y-auto scrollbar-thin">
        <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={pathname === '/dashboard'} />
        <div className="mt-4 mb-2 px-2 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
          Categories
        </div>
        {CATEGORY_MAP.map((c) => (
          <NavItem
            key={c.slug}
            href={`/inbox/${c.slug}`}
            icon={Mail}
            label={c.label}
            active={pathname === `/inbox/${c.slug}`}
          />
        ))}
        <div className="mt-6 mb-2 px-2 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
          Other
        </div>
        <NavItem href="/digest" icon={Calendar} label="Digest" active={pathname === '/digest'} />
        <NavItem href="/settings" icon={SettingsIcon} label="Settings" active={pathname === '/settings'} />
      </nav>
      <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
        Faculty Inbox Co-Pilot
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-0.5 transition-colors',
        active
          ? 'bg-slate-900 text-white'
          : 'text-slate-700 hover:bg-slate-100',
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </Link>
  );
}

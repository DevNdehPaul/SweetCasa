'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Building2, FileCheck2, Flag, Users, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth'

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutGrid },
  { href: '/listings', label: 'Listings', icon: Building2 },
  { href: '/documents', label: 'Documents', icon: FileCheck2 },
  { href: '/reports', label: 'Reports', icon: Flag },
  { href: '/users', label: 'Users', icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { admin, logout } = useAuth()

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-navy text-white/90">
      <div className="px-6 py-7">
        <div className="font-display text-2xl leading-none text-white">SweetCasa</div>
        <div className="mt-1 text-xs uppercase tracking-[0.14em] text-gold">Trust Desk</div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="mb-2 px-3 text-sm">
          <div className="truncate font-medium text-white">{admin?.name}</div>
          <div className="truncate text-xs text-white/50">{admin?.email}</div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut size={17} strokeWidth={2} />
          Log out
        </button>
      </div>
    </aside>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Building2, FileCheck2, Flag, Users, UserPlus, ScrollText, LogOut, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutGrid, adminOnly: false },
  { href: '/listings', label: 'Listings', icon: Building2, adminOnly: false },
  { href: '/documents', label: 'Documents', icon: FileCheck2, adminOnly: false },
  { href: '/reports', label: 'Reports', icon: Flag, adminOnly: false },
  { href: '/users', label: 'Users', icon: Users, adminOnly: false },
  { href: '/invites', label: 'Invite Staff', icon: UserPlus, adminOnly: true },
  { href: '/audit-logs', label: 'Audit Log', icon: ScrollText, adminOnly: false },
]

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { admin, isAdmin, logout } = useAuth()
  const items = NAV.filter((item) => !item.adminOnly || isAdmin)

  return (
    <>
      {/* Backdrop — mobile only, shown while the drawer is open */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col bg-navy text-white/90 transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-7">
          <div>
            <div className="font-display text-2xl leading-none text-white">SweetCasa</div>
            <div className="mt-1 text-xs uppercase tracking-[0.14em] text-gold">Trust Desk</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/5 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
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
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-white">{admin?.name}</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                {admin?.role}
              </span>
            </div>
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
    </>
  )
}

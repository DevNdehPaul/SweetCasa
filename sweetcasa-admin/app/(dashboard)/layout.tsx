'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/lib/auth'
import { CenteredSpinner } from '@/components/ui'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { admin, loading } = useAuth()
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!loading && !admin) router.replace('/login')
  }, [loading, admin, router])

  // middleware.ts already redirects unauthenticated requests to /login server-side.
  // This covers the brief window on first client render, and the case where the
  // token cookie exists but the locally cached profile doesn't (e.g. cleared storage).
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <CenteredSpinner label="Loading Trust Desk…" />
      </div>
    )
  }

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <CenteredSpinner label="Redirecting to sign in…" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-paper md:flex-row">
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile-only top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3.5 backdrop-blur md:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg p-1.5 text-ink/70 hover:bg-ink/5"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="font-display text-lg text-ink">SweetCasa</div>
          <div className="w-8" />
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}

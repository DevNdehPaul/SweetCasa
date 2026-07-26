'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/lib/auth'
import { CenteredSpinner } from '@/components/ui'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { admin, loading } = useAuth()
  const router = useRouter()

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
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}

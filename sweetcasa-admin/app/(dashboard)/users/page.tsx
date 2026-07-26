'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, BadgeCheck, BadgeAlert } from 'lucide-react'
import api, { apiErrorMessage } from '@/lib/api'
import type { AdminUser, UserRole } from '@/lib/types'
import { PageHeader, CenteredSpinner, EmptyState, ErrorBanner } from '@/components/ui'

const TABS: { label: string; value: UserRole | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'House owners', value: 'SELLER' },
  { label: 'House seekers', value: 'BUYER' },
  { label: 'Admins', value: 'ADMIN' },
]

function UsersPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const role = (params.get('role') as UserRole | null) ?? 'All'

  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback((r: string, q: string) => {
    setUsers(null)
    setError(null)
    const query: Record<string, string> = {}
    if (r !== 'All') query.role = r
    if (q.trim()) query.search = q.trim()
    api
      .get('/admin/users', { params: query })
      .then((res) => setUsers(res.data.users))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load users.')))
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => load(role, search), 250)
    return () => clearTimeout(timeout)
  }, [role, search, load])

  return (
    <div>
      <PageHeader title="Users" subtitle="House owners, house seekers, and their ID-verification status." />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 border-b border-line">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => router.push(`/users?role=${tab.value}`)}
              className={`border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors ${
                role === tab.value ? 'border-navy text-navy' : 'border-transparent text-ink/50 hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-64 rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-navy"
          />
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {!users && !error && <CenteredSpinner />}

      {users && users.length === 0 && <EmptyState title="No users found" description="Try a different search or filter." />}

      {users && users.length > 0 && (
        <div className="overflow-hidden rounded-card border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Listings</th>
                <th className="px-5 py-3 font-medium">ID verified</th>
                <th className="px-5 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{u.companyName || u.name || '—'}</td>
                  <td className="px-5 py-3 text-ink/65">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink/60">{u.role}</span>
                  </td>
                  <td className="px-5 py-3 text-ink/65">{[u.city, u.region].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-5 py-3 font-mono text-ink/65">{u.listingCount}</td>
                  <td className="px-5 py-3">
                    {u.idVerified ? (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <BadgeCheck size={14} /> Submitted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-ink/40">
                        <BadgeAlert size={14} /> None
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink/50">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function UsersPage() {
  return (
    <Suspense fallback={<CenteredSpinner />}>
      <UsersPageInner />
    </Suspense>
  )
}

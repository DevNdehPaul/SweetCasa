'use client'

import StatusBadge from '@/components/StatusBadge'
import SuspendModal from '@/components/SuspendModal'
import { CenteredSpinner, EmptyState, ErrorBanner, PageHeader, useConfirm } from '@/components/ui'
import api, { apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { AdminUser, UserRole } from '@/lib/types'
import { BadgeAlert, BadgeCheck, Search, ShieldCheck, ShieldOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'

const TABS: { label: string; value: UserRole | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'House owners', value: 'SELLER' },
  { label: 'House seekers', value: 'BUYER' },
  { label: 'Admins', value: 'ADMIN' },
  { label: 'Staff', value: 'STAFF' },
]

function UsersPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { isAdmin } = useAuth()
  const { confirm, dialog } = useConfirm()
  const role = (params.get('role') as UserRole | 'All' | null) ?? 'All'

  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null)

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

  function labelFor(u: AdminUser) {
    return u.companyName || u.name || u.email
  }

  async function reactivate(u: AdminUser) {
    setBusyId(u.id)
    try {
      await api.patch(`/admin/users/${u.id}/reactivate`)
      load(role, search)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reactivate this user.'))
    } finally {
      setBusyId(null)
    }
  }

  async function suspend(u: AdminUser, reason: string) {
    await api.patch(`/admin/users/${u.id}/suspend`, { reason })
    setSuspendTarget(null)
    load(role, search)
  }

  return (
    <div>
      {dialog}
      {suspendTarget && (
        <SuspendModal
          userLabel={labelFor(suspendTarget)}
          onCancel={() => setSuspendTarget(null)}
          onSubmit={(reason) => suspend(suspendTarget, reason)}
        />
      )}

      <PageHeader title="Users" subtitle="House owners, house seekers, and their ID-verification status." />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => router.push(`/users?role=${tab.value}`)}
              className={`shrink-0 border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors ${
                role === tab.value ? 'border-navy text-navy' : 'border-transparent text-ink/50 hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-auto">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-navy sm:w-64"
          />
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {!users && !error && <CenteredSpinner />}

      {users && users.length === 0 && <EmptyState title="No users found" description="Try a different search or filter." />}

      {users && users.length > 0 && (
        <div className="overflow-hidden rounded-card border border-line bg-white">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">ID</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Listings</th>
                <th className="px-5 py-3 font-medium">ID verified</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                {isAdmin && <th className="px-5 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const suspendable = u.role !== 'ADMIN'
                return (
                  <tr key={u.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/users/${u.id}`} className="font-mono text-xs text-navy hover:underline">
                        #{u.id}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-medium text-ink">{u.companyName || u.name || '—'}</td>
                    <td className="px-5 py-3 text-ink/65">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink/60">{u.role}</span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={u.status} />
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
                    {isAdmin && (
                      <td className="px-5 py-3">
                        {!suspendable ? (
                          <span className="text-xs text-ink/30">—</span>
                        ) : u.status === 'Suspended' ? (
                          <button
                            disabled={busyId === u.id}
                            onClick={() =>
                              confirm({
                                title: 'Reactivate this account?',
                                description: `${labelFor(u)} will immediately be able to log in again.`,
                                confirmLabel: 'Reactivate',
                                tone: 'success',
                                onConfirm: () => reactivate(u),
                              })
                            }
                            className="flex items-center gap-1.5 rounded-lg border border-success/30 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/10 disabled:opacity-50"
                          >
                            <ShieldCheck size={13} /> Reactivate
                          </button>
                        ) : (
                          <button
                            disabled={busyId === u.id}
                            onClick={() => setSuspendTarget(u)}
                            className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                          >
                            <ShieldOff size={13} /> Suspend
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
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

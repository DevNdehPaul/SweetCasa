'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, BadgeAlert, ShieldOff, ShieldCheck, MapPin, Building2 } from 'lucide-react'
import api, { apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { AdminUser } from '@/lib/types'
import { CenteredSpinner, ErrorBanner, EmptyState, useConfirm } from '@/components/ui'
import StatusBadge from '@/components/StatusBadge'
import SuspendModal from '@/components/SuspendModal'

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isAdmin } = useAuth()
  const { confirm, dialog } = useConfirm()

  const [user, setUser] = useState<AdminUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)

  const load = useCallback(() => {
    api
      .get(`/admin/users/${id}`)
      .then((res) => setUser(res.data.user))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this user.')))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function reactivate() {
    setBusy(true)
    setActionError(null)
    try {
      await api.patch(`/admin/users/${id}/reactivate`)
      load()
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Could not reactivate this user.'))
    } finally {
      setBusy(false)
    }
  }

  async function suspend(reason: string) {
    await api.patch(`/admin/users/${id}/suspend`, { reason })
    setShowSuspendModal(false)
    load()
  }

  if (error) return <ErrorBanner message={error} />
  if (!user) return <CenteredSpinner />

  const suspendable = user.role !== 'ADMIN' && user.role !== 'STAFF'
  const label = user.companyName || user.name || user.email

  return (
    <div>
      {dialog}
      {showSuspendModal && (
        <SuspendModal userLabel={label} onCancel={() => setShowSuspendModal(false)} onSubmit={suspend} />
      )}

      <button
        onClick={() => router.push('/users')}
        className="mb-5 flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to users
      </button>

      {actionError && <ErrorBanner message={actionError} />}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl text-ink sm:text-[26px]">{label}</h1>
            <StatusBadge status={user.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink/60">
            <span className="font-mono text-xs text-ink/40">#{user.id}</span>
            <span className="rounded-full bg-paper px-2 py-0.5 text-xs">{user.role}</span>
            <span>{user.email}</span>
            {user.phone && <span>{user.phone}</span>}
          </div>
          {user.status === 'Suspended' && user.suspensionReason && (
            <p className="mt-2 max-w-xl rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
              <span className="font-medium">Suspension reason:</span> {user.suspensionReason}
            </p>
          )}
        </div>

        {isAdmin && suspendable && (
          <div>
            {user.status === 'Suspended' ? (
              <button
                disabled={busy}
                onClick={() =>
                  confirm({
                    title: 'Reactivate this account?',
                    description: `${label} will immediately be able to log in again.`,
                    confirmLabel: 'Reactivate',
                    tone: 'success',
                    onConfirm: reactivate,
                  })
                }
                className="flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50"
              >
                <ShieldCheck size={15} /> Reactivate
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => setShowSuspendModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
              >
                <ShieldOff size={15} /> Suspend
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink/45">Listings</h2>
          {!user.listings || user.listings.length === 0 ? (
            <EmptyState title="No listings yet" description={`${label} hasn't submitted any listings.`} />
          ) : (
            <div className="space-y-2">
              {user.listings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3 hover:bg-paper/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-line/40 text-ink/40">
                      <Building2 size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ink">{listing.title}</div>
                      <div className="flex items-center gap-1 text-xs text-ink/50">
                        <MapPin size={11} /> {listing.city} · {Number(listing.price).toLocaleString()} FCFA
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={listing.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink/45">Profile</h2>
          <div className="space-y-3 rounded-card border border-line bg-white p-4 text-sm">
            <Row label="Location" value={[user.city, user.region, user.country].filter(Boolean).join(', ') || '—'} />
            <Row label="Listings submitted" value={String(user.listingCount)} />
            <Row label="Joined" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'} />
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-ink/45">National ID</span>
              {user.nationalIdUrl ? (
                <a href={user.nationalIdUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-navy hover:underline">
                  <BadgeCheck size={14} /> View
                </a>
              ) : (
                <span className="flex items-center gap-1 text-ink/40">
                  <BadgeAlert size={14} /> Not submitted
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink/45">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  )
}

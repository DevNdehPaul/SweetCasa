'use client'

import { useEffect, useState, useCallback, FormEvent } from 'react'
import { UserPlus, Mail, XCircle } from 'lucide-react'
import api, { apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { StaffInvite } from '@/lib/types'
import { PageHeader, CenteredSpinner, EmptyState, ErrorBanner, useConfirm } from '@/components/ui'
import StatusBadge from '@/components/StatusBadge'

export default function InvitesPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const { confirm, dialog } = useConfirm()

  const [invites, setInvites] = useState<StaffInvite[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)

  const load = useCallback(() => {
    setInvites(null)
    setError(null)
    api
      .get('/admin/invites')
      .then((res) => setInvites(res.data.invites))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load invites.')))
  }, [])

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  async function sendInvite(e: FormEvent) {
    e.preventDefault()
    setSendError(null)
    setSendSuccess(null)
    setSending(true)
    try {
      await api.post('/admin/invites', { email })
      setSendSuccess(`Invite sent to ${email}.`)
      setEmail('')
      load()
    } catch (err) {
      setSendError(apiErrorMessage(err, 'Could not send this invite.'))
    } finally {
      setSending(false)
    }
  }

  async function revoke(invite: StaffInvite) {
    try {
      await api.patch(`/admin/invites/${invite.id}/revoke`)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not revoke this invite.'))
    }
  }

  if (!authLoading && !isAdmin) {
    return (
      <div>
        <PageHeader title="Invite Staff" />
        <EmptyState title="Admins only" description="Only SweetCasa admins can invite and manage staff accounts." />
      </div>
    )
  }

  return (
    <div>
      {dialog}
      <PageHeader title="Invite Staff" subtitle="Bring on staff to help review listings, documents, and reports." />

      <form onSubmit={sendInvite} className="mb-8 flex max-w-lg flex-col items-stretch gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink">Staff email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@sweetcasa.com"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={sending}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-50 sm:mt-[26px]"
        >
          <UserPlus size={15} /> {sending ? 'Sending…' : 'Send invite'}
        </button>
      </form>
      {sendError && <ErrorBanner message={sendError} />}
      {sendSuccess && (
        <div className="mb-6 -mt-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          {sendSuccess}
        </div>
      )}

      {error && <ErrorBanner message={error} />}
      {!invites && !error && <CenteredSpinner />}

      {invites && invites.length === 0 && (
        <EmptyState title="No invites yet" description="Sent invites will show up here so you can track who's joined." />
      )}

      {invites && invites.length > 0 && (
        <div className="overflow-hidden rounded-card border border-line bg-white">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Sent</th>
                <th className="px-5 py-3 font-medium">Expires</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id} className="border-b border-line last:border-0">
                  <td className="flex items-center gap-2 px-5 py-3 font-medium text-ink">
                    <Mail size={14} className="text-ink/35" /> {invite.email}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={invite.status} />
                  </td>
                  <td className="px-5 py-3 text-ink/50">{invite.createdAt ? new Date(invite.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3 text-ink/50">{new Date(invite.expiresAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    {invite.status === 'Pending' && (
                      <button
                        onClick={() =>
                          confirm({
                            title: 'Revoke this invite?',
                            description: `${invite.email} will no longer be able to use this link to join.`,
                            confirmLabel: 'Revoke invite',
                            tone: 'danger',
                            onConfirm: () => revoke(invite),
                          })
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10"
                      >
                        <XCircle size={13} /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}

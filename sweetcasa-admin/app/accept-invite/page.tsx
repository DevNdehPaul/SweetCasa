'use client'

import { FormEvent, useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ShieldCheck, CheckCircle2 } from 'lucide-react'
import api, { apiErrorMessage } from '@/lib/api'
import { CenteredSpinner } from '@/components/ui'

function AcceptInviteInner() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') || ''

  const [checking, setChecking] = useState(true)
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setInviteError('This invite link is missing a token.')
      setChecking(false)
      return
    }
    api
      .get(`/admin/invites/token/${token}`)
      .then((res) => setInviteEmail(res.data.email))
      .catch((err) => setInviteError(apiErrorMessage(err, 'This invite link is invalid or has expired.')))
      .finally(() => setChecking(false))
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/admin/invites/accept', { token, password, name })
      setDone(true)
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not set up your account.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-gold/15">
            <ShieldCheck className="text-gold" size={22} strokeWidth={2} />
          </div>
          <div className="font-display text-3xl text-white">SweetCasa</div>
          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-gold">Trust Desk</div>
        </div>

        <div className="rounded-card bg-white p-6 shadow-xl">
          {checking && <CenteredSpinner label="Checking your invite…" />}

          {!checking && inviteError && (
            <div>
              <h1 className="mb-2 font-display text-xl text-ink">Invite not valid</h1>
              <p className="text-sm text-danger">{inviteError}</p>
              <p className="mt-3 text-sm text-ink/60">Ask whoever invited you to send a new invite.</p>
            </div>
          )}

          {!checking && !inviteError && done && (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-3 text-success" size={32} />
              <h1 className="mb-1 font-display text-xl text-ink">You're all set</h1>
              <p className="mb-5 text-sm text-ink/60">Your account has been created.</p>
              <button
                onClick={() => router.push('/login')}
                className="w-full rounded-lg bg-navy py-2.5 text-sm font-medium text-white hover:bg-navy-light"
              >
                Go to sign in
              </button>
            </div>
          )}

          {!checking && !inviteError && !done && (
            <form onSubmit={handleSubmit}>
              <h1 className="mb-1 font-display text-xl text-ink">Set up your account</h1>
              <p className="mb-5 text-sm text-ink/55">
                Joining as <span className="font-medium text-ink">{inviteEmail}</span>
              </p>

              {formError && (
                <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                  {formError}
                </div>
              )}

              <label className="mb-3 block text-sm">
                <span className="mb-1 block font-medium text-ink">Your name</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-navy"
                  placeholder="Ndeh Paul"
                />
              </label>

              <label className="mb-3 block text-sm">
                <span className="mb-1 block font-medium text-ink">Password</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-navy"
                  placeholder="At least 8 characters"
                />
              </label>

              <label className="mb-5 block text-sm">
                <span className="mb-1 block font-medium text-ink">Confirm password</span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-navy"
                  placeholder="Re-enter your password"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-navy py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-light disabled:opacity-60"
              >
                {submitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-navy"><CenteredSpinner /></div>}>
      <AcceptInviteInner />
    </Suspense>
  )
}

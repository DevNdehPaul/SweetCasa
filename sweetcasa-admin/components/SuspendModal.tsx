'use client'

import { useState } from 'react'

export default function SuspendModal({
  userLabel,
  onCancel,
  onSubmit,
}: {
  userLabel: string
  onCancel: () => void
  onSubmit: (reason: string) => Promise<void> | void
}) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(reason.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-card bg-white p-6 shadow-xl">
        <h2 className="font-display text-xl text-ink">Suspend {userLabel}?</h2>
        <p className="mt-1.5 text-sm text-ink/60">
          They won&apos;t be able to log in to SweetCasa until you reactivate the account.
        </p>

        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block font-medium text-ink">Reason (optional, kept internal)</span>
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Repeated fake listings, reported for scam attempts…"
            className="w-full resize-none rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-navy"
          />
        </label>

        {error && <p className="mt-2 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50"
          >
            {submitting ? 'Suspending…' : 'Suspend account'}
          </button>
        </div>
      </div>
    </div>
  )
}

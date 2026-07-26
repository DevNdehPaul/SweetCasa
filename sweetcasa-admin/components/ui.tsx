'use client'

import { ReactNode, useState } from 'react'
import { Inbox, Loader2 } from 'lucide-react'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-[28px] leading-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink/60">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-white/60 px-6 py-16 text-center">
      <Inbox className="mb-3 text-ink/30" size={28} strokeWidth={1.5} />
      <div className="font-medium text-ink">{title}</div>
      {description && <div className="mt-1 max-w-sm text-sm text-ink/50">{description}</div>}
    </div>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} size={18} />
}

export function CenteredSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-ink/50">
      <Spinner />
      {label}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
      {message}
    </div>
  )
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    tone: 'danger' | 'success' | 'navy'
    onConfirm: () => void
  } | null>(null)

  function confirm(opts: {
    title: string
    description: string
    confirmLabel: string
    tone?: 'danger' | 'success' | 'navy'
    onConfirm: () => void
  }) {
    setState({ open: true, tone: 'navy', ...opts })
  }

  const dialog = state?.open ? (
    <ConfirmDialog
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      tone={state.tone}
      onCancel={() => setState(null)}
      onConfirm={() => {
        state.onConfirm()
        setState(null)
      }}
    />
  ) : null

  return { confirm, dialog }
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  tone,
  onCancel,
  onConfirm,
}: {
  title: string
  description: string
  confirmLabel: string
  tone: 'danger' | 'success' | 'navy'
  onCancel: () => void
  onConfirm: () => void
}) {
  const toneClass =
    tone === 'danger' ? 'bg-danger hover:bg-danger/90' : tone === 'success' ? 'bg-success hover:bg-success/90' : 'bg-navy hover:bg-navy-light'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-xl">
        <h2 className="font-display text-xl text-ink">{title}</h2>
        <p className="mt-2 text-sm text-ink/60">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${toneClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

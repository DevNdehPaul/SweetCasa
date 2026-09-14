'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, FileCheck2, Flag, Users, ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react'
import api, { apiErrorMessage } from '@/lib/api'
import type { Stats } from '@/lib/types'
import { PageHeader, CenteredSpinner, ErrorBanner } from '@/components/ui'
import { readCache, writeCache } from '@/lib/fast-cache'

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(() => readCache<Stats>('stats'))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get('/admin/stats')
      .then((res) => { setStats(res.data); writeCache('stats', res.data) })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load dashboard stats.')))
  }, [])

  return (
    <div>
      <div className="mb-8 overflow-hidden rounded-[24px] border border-navy/10 bg-gradient-to-br from-navy-dark via-navy to-[#8B5CF6] px-6 py-7 text-white shadow-[0_18px_50px_rgba(79,36,184,0.20)] sm:px-8 sm:py-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
              <ShieldCheck size={14} /> SweetCasa Trust Desk
            </div>
            <h1 className="font-display text-3xl leading-tight sm:text-4xl">Overview</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Review platform activity, protect the community, and handle what needs your attention.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-white/65"><Sparkles size={14} /> Live administration workspace</div>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {!stats && !error && <CenteredSpinner />}

      {stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              href="/listings?status=Pending"
              icon={Building2}
              label="Listings awaiting review"
              value={stats.listings.pending}
              tone="purple"
            />
            <StatCard
              href="/documents?status=Pending"
              icon={FileCheck2}
              label="Documents awaiting review"
              value={stats.documents.pending}
              tone="purple"
            />
            <StatCard
              href="/reports?status=Pending"
              icon={Flag}
              label="Reports awaiting review"
              value={stats.reports.pending}
              tone="danger"
            />
            <StatCard href="/users" icon={Users} label="Registered users" value={stats.users.total} tone="purple" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryRow label="Approved listings" value={stats.listings.approved} />
            <SummaryRow label="Rejected listings" value={stats.listings.rejected} />
            <SummaryRow label="Owners / seekers" value={`${stats.users.sellers} / ${stats.users.buyers}`} />
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({
  href,
  icon: Icon,
  label,
  value,
  tone,
}: {
  href: string
  icon: typeof Building2
  label: string
  value: number
  tone: 'purple' | 'danger'
}) {
  const toneClass = tone === 'danger' ? 'text-danger bg-danger/10 ring-danger/10' : 'text-navy bg-navy/10 ring-navy/10'

  return (
    <Link
      href={href}
      className="group flex min-h-[170px] flex-col justify-between rounded-card border border-line/90 bg-white p-5 shadow-[0_8px_30px_rgba(42,26,70,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-navy/20 hover:shadow-[0_16px_38px_rgba(79,36,184,0.11)]"
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${toneClass}`}>
          <Icon size={17} strokeWidth={2} />
        </div>
        <ArrowUpRight size={17} className="text-ink/20 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-navy" />
      </div>
      <div className="mt-5 text-3xl font-semibold tracking-tight text-ink">{value}</div>
      <div className="mt-1 text-sm font-medium text-ink/50">{label}</div>
    </Link>
  )
}

function SummaryRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-card border border-line/90 bg-white px-5 py-5 shadow-[0_6px_24px_rgba(42,26,70,0.04)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/40">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-ink">{value}</div>
    </div>
  )
}

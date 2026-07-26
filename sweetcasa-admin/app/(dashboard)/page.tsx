'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, FileCheck2, Flag, Users, ArrowRight } from 'lucide-react'
import api, { apiErrorMessage } from '@/lib/api'
import type { Stats } from '@/lib/types'
import { PageHeader, CenteredSpinner, ErrorBanner } from '@/components/ui'

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get('/admin/stats')
      .then((res) => setStats(res.data))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load dashboard stats.')))
  }, [])

  return (
    <div>
      <PageHeader title="Overview" subtitle="What needs your attention right now." />

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
              tone="gold"
            />
            <StatCard
              href="/documents?status=Pending"
              icon={FileCheck2}
              label="Documents awaiting review"
              value={stats.documents.pending}
              tone="gold"
            />
            <StatCard
              href="/reports?status=Pending"
              icon={Flag}
              label="Reports awaiting review"
              value={stats.reports.pending}
              tone="danger"
            />
            <StatCard href="/users" icon={Users} label="Registered users" value={stats.users.total} tone="navy" />
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
  tone: 'gold' | 'danger' | 'navy'
}) {
  const toneClass = tone === 'gold' ? 'text-pending bg-gold/10' : tone === 'danger' ? 'text-danger bg-danger/10' : 'text-navy bg-navy/10'

  return (
    <Link
      href={href}
      className="group flex flex-col justify-between rounded-card border border-line bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon size={17} strokeWidth={2} />
        </div>
        <ArrowRight size={15} className="text-ink/20 transition-transform group-hover:translate-x-0.5 group-hover:text-ink/50" />
      </div>
      <div className="mt-4 font-mono text-3xl text-ink">{value}</div>
      <div className="mt-1 text-sm text-ink/55">{label}</div>
    </Link>
  )
}

function SummaryRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-card border border-line bg-white px-5 py-4">
      <div className="text-xs uppercase tracking-wide text-ink/45">{label}</div>
      <div className="mt-1 font-mono text-xl text-ink">{value}</div>
    </div>
  )
}

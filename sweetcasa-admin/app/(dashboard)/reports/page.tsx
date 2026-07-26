'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Flag } from 'lucide-react'
import api, { apiErrorMessage } from '@/lib/api'
import type { Report, ReportStatus } from '@/lib/types'
import { PageHeader, CenteredSpinner, EmptyState, ErrorBanner } from '@/components/ui'
import StatusBadge from '@/components/StatusBadge'

const TABS: { label: string; value: ReportStatus | 'All' }[] = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Reviewed', value: 'Reviewed' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'All', value: 'All' },
]

const NEXT_STATUS: Record<ReportStatus, ReportStatus | null> = {
  Pending: 'Reviewed',
  Reviewed: 'Resolved',
  Resolved: null,
}

function ReportsPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const status = (params.get('status') as ReportStatus | 'All' | null) ?? 'Pending'

  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const load = useCallback((s: string) => {
    setReports(null)
    setError(null)
    api
      .get('/reports', { params: s === 'All' ? {} : { status: s } })
      .then((res) => setReports(res.data.reports))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load reports.')))
  }, [])

  useEffect(() => {
    load(status)
  }, [status, load])

  async function advance(report: Report) {
    const next = NEXT_STATUS[report.status]
    if (!next) return
    setBusyId(report.id)
    try {
      await api.patch(`/reports/${report.id}`, { status: next })
      load(status)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not update this report.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-6"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Evidence" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}

      <PageHeader title="Reports" subtitle="Abuse and fraud reports submitted by users." />

      <div className="mb-5 flex gap-1 border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => router.push(`/reports?status=${tab.value}`)}
            className={`border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors ${
              status === tab.value ? 'border-navy text-navy' : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}
      {!reports && !error && <CenteredSpinner />}

      {reports && reports.length === 0 && (
        <EmptyState title={`No ${status === 'All' ? '' : status.toLowerCase()} reports`} description="Reports submitted from the mobile app will show up here." />
      )}

      {reports && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="rounded-card border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
                    <Flag size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{report.subject}</span>
                      <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink/50">{report.category}</span>
                    </div>
                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink/65">{report.description}</p>
                    <div className="mt-2 text-xs text-ink/45">
                      {report.user ? `${report.user.name || report.user.email} (${report.user.role})` : 'Anonymous report'}
                      {report.createdAt && ` · ${new Date(report.createdAt).toLocaleDateString()}`}
                      {report.followUp && ' · Follow-up requested'}
                    </div>
                    {report.evidenceUrls && report.evidenceUrls.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        {report.evidenceUrls.map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={url}
                            alt={`Evidence ${i + 1}`}
                            onClick={() => setLightbox(url)}
                            className="h-16 w-16 cursor-pointer rounded-md object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={report.status} />
                  {NEXT_STATUS[report.status] && (
                    <button
                      disabled={busyId === report.id}
                      onClick={() => advance(report)}
                      className="rounded-lg border border-navy/30 px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy/5 disabled:opacity-50"
                    >
                      Mark {NEXT_STATUS[report.status]}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<CenteredSpinner />}>
      <ReportsPageInner />
    </Suspense>
  )
}

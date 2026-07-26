'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, Check, X } from 'lucide-react'
import api, { apiErrorMessage } from '@/lib/api'
import type { DocumentRecord, DocumentStatus } from '@/lib/types'
import { PageHeader, CenteredSpinner, EmptyState, ErrorBanner } from '@/components/ui'
import StatusBadge from '@/components/StatusBadge'

const TABS: { label: string; value: DocumentStatus | 'All' }[] = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Verified', value: 'Verified' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'All', value: 'All' },
]

function DocumentsPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const status = (params.get('status') as DocumentStatus | 'All' | null) ?? 'Pending'

  const [documents, setDocuments] = useState<DocumentRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback((s: string) => {
    setDocuments(null)
    setError(null)
    api
      .get('/documents', { params: s === 'All' ? {} : { status: s } })
      .then((res) => setDocuments(res.data.documents))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load documents.')))
  }, [])

  useEffect(() => {
    load(status)
  }, [status, load])

  async function act(docId: number, action: 'verify' | 'reject') {
    setBusyId(docId)
    try {
      await api.patch(`/documents/${docId}/${action}`)
      load(status)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not update this document.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Documents" subtitle="Verify legal documents and floor plans attached to listings." />

      <div className="mb-5 flex gap-1 border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => router.push(`/documents?status=${tab.value}`)}
            className={`border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors ${
              status === tab.value ? 'border-navy text-navy' : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}
      {!documents && !error && <CenteredSpinner />}

      {documents && documents.length === 0 && (
        <EmptyState title={`No ${status === 'All' ? '' : status.toLowerCase()} documents`} description="Documents owners upload to a listing's vault appear here." />
      )}

      {documents && documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-card border border-line bg-white px-5 py-3.5">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-line/40 text-ink/40">
                  <FileText size={16} />
                </div>
                <div className="overflow-hidden">
                  <a href={doc.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-navy hover:underline">
                    {doc.fileName || doc.type.replace('_', ' ')}
                  </a>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-ink/50">
                    <span>{doc.type.replace('_', ' ')}</span>
                    {doc.listing && (
                      <>
                        <span>·</span>
                        <Link href={`/listings/${doc.listing.id}`} className="hover:underline">
                          {doc.listing.title}
                        </Link>
                      </>
                    )}
                    {doc.uploader && (
                      <>
                        <span>·</span>
                        <span>{doc.uploader.name || doc.uploader.email}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={doc.status} />
                {doc.status === 'Pending' && (
                  <>
                    <button
                      disabled={busyId === doc.id}
                      onClick={() => act(doc.id, 'reject')}
                      className="rounded-md border border-danger/30 p-1.5 text-danger hover:bg-danger/10 disabled:opacity-50"
                      title="Reject document"
                    >
                      <X size={14} />
                    </button>
                    <button
                      disabled={busyId === doc.id}
                      onClick={() => act(doc.id, 'verify')}
                      className="rounded-md border border-success/30 p-1.5 text-success hover:bg-success/10 disabled:opacity-50"
                      title="Verify document"
                    >
                      <Check size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<CenteredSpinner />}>
      <DocumentsPageInner />
    </Suspense>
  )
}

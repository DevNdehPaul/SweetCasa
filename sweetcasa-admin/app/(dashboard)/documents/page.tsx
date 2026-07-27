'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, Check, X } from 'lucide-react'
import api, { apiErrorMessage } from '@/lib/api'
import type { DocumentRecord, DocumentStatus } from '@/lib/types'
import { PageHeader, CenteredSpinner, EmptyState, ErrorBanner } from '@/components/ui'
import StatusBadge from '@/components/StatusBadge'
import RejectionModal from '@/components/RejectionModal'

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
  const [rejectId, setRejectId] = useState<number | null>(null)

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

  async function verify(docId: number) {
    setBusyId(docId)
    try {
      await api.patch(`/documents/${docId}/verify`)
      load(status)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not verify this document.'))
    } finally {
      setBusyId(null)
    }
  }

  async function reject(note: string) {
    if (!rejectId) return
    try {
      await api.patch(`/documents/${rejectId}/reject`, { note })
      setRejectId(null)
      load(status)
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'Could not reject this document.'))
    }
  }

  return (
    <div>
      {rejectId !== null && (
        <RejectionModal
          title="Reject this document"
          description="The uploader will receive your note by email and can re-upload a corrected version."
          onCancel={() => setRejectId(null)}
          onSubmit={reject}
        />
      )}

      <PageHeader title="Documents" subtitle="Verify legal documents and floor plans attached to listings." />

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => router.push(`/documents?status=${tab.value}`)}
            className={`shrink-0 border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors ${
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
            <div key={doc.id} className="flex flex-col gap-3 rounded-card border border-line bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-line/40 text-ink/40">
                  <FileText size={16} />
                </div>
                <div className="min-w-0 overflow-hidden">
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
                  {doc.status === 'Rejected' && doc.reviewNote && (
                    <p className="mt-1 text-xs text-danger">Note sent: {doc.reviewNote}</p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={doc.status} />
                {doc.status === 'Pending' && (
                  <>
                    <button
                      disabled={busyId === doc.id}
                      onClick={() => setRejectId(doc.id)}
                      className="rounded-md border border-danger/30 p-1.5 text-danger hover:bg-danger/10 disabled:opacity-50"
                      title="Reject document"
                    >
                      <X size={14} />
                    </button>
                    <button
                      disabled={busyId === doc.id}
                      onClick={() => verify(doc.id)}
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

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Check, X, MapPin, BedDouble, Bath } from 'lucide-react'
import api, { apiErrorMessage } from '@/lib/api'
import type { Listing } from '@/lib/types'
import { CenteredSpinner, ErrorBanner, useConfirm } from '@/components/ui'
import StatusBadge from '@/components/StatusBadge'
import RejectionModal from '@/components/RejectionModal'

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { confirm, dialog } = useConfirm()

  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectDocId, setRejectDocId] = useState<number | null>(null)

  const load = useCallback(() => {
    api
      .get(`/listings/admin/${id}`)
      .then((res) => setListing(res.data.listing))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this listing.')))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function approve() {
    setBusy(true)
    setActionError(null)
    try {
      await api.patch(`/listings/${id}/approve`)
      load()
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Could not approve this listing.'))
    } finally {
      setBusy(false)
    }
  }

  async function reject(note: string) {
    setActionError(null)
    try {
      await api.patch(`/listings/${id}/reject`, { note })
      setShowRejectModal(false)
      load()
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'Could not reject this listing.'))
    }
  }

  async function verifyDoc(docId: number) {
    try {
      await api.patch(`/documents/${docId}/verify`)
      load()
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Could not verify this document.'))
    }
  }

  async function rejectDoc(note: string) {
    if (!rejectDocId) return
    try {
      await api.patch(`/documents/${rejectDocId}/reject`, { note })
      setRejectDocId(null)
      load()
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'Could not reject this document.'))
    }
  }

  if (error) return <ErrorBanner message={error} />
  if (!listing) return <CenteredSpinner />

  return (
    <div>
      {dialog}
      {showRejectModal && (
        <RejectionModal
          title="Reject this listing"
          description={`${listing.title} — the owner will receive your note by email and can edit and resubmit.`}
          onCancel={() => setShowRejectModal(false)}
          onSubmit={reject}
        />
      )}
      {rejectDocId !== null && (
        <RejectionModal
          title="Reject this document"
          description="The uploader will receive your note by email and can re-upload a corrected version."
          onCancel={() => setRejectDocId(null)}
          onSubmit={rejectDoc}
        />
      )}
      <button
        onClick={() => router.push('/listings')}
        className="mb-5 flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to listings
      </button>

      {actionError && <ErrorBanner message={actionError} />}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2.5">
            <h1 className="font-display text-[26px] text-ink">{listing.title}</h1>
            <StatusBadge status={listing.status} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink/60">
            <span className="flex items-center gap-1">
              <MapPin size={14} /> {listing.neighborhood ? `${listing.neighborhood}, ` : ''}{listing.city}, {listing.region}
            </span>
            <span className="flex items-center gap-1">
              <BedDouble size={14} /> {listing.bedrooms} bed
            </span>
            <span className="flex items-center gap-1">
              <Bath size={14} /> {listing.bathrooms} bath
            </span>
            <span className="font-mono">{Number(listing.price).toLocaleString()} FCFA</span>
          </div>
          {listing.status === 'Rejected' && listing.rejectionNote && (
            <p className="mt-2 max-w-xl rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
              <span className="font-medium">Rejection note sent to owner:</span> {listing.rejectionNote}
            </p>
          )}
        </div>

        {listing.status === 'Pending' && (
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => setShowRejectModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
            >
              <X size={15} /> Reject
            </button>
            <button
              disabled={busy}
              onClick={() =>
                confirm({
                  title: 'Approve this listing?',
                  description: 'It will immediately become visible to house seekers on SweetCasa.',
                  confirmLabel: 'Approve listing',
                  tone: 'success',
                  onConfirm: approve,
                })
              }
              className="flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50"
            >
              <Check size={15} /> Approve
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Photos">
            {listing.images.length === 0 ? (
              <p className="text-sm text-ink/50">No photos uploaded.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {listing.images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={img.id} src={img.imageUrl} alt="" className="aspect-square rounded-lg object-cover" />
                ))}
              </div>
            )}
          </Section>

          <Section title="Description">
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink/70">{listing.description}</p>
          </Section>

          <Section title="Floor plan">
            {listing.floorPlanUrl ? (
              <a
                href={listing.floorPlanUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-fit items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-navy hover:underline"
              >
                <FileText size={15} /> View floor plan
              </a>
            ) : (
              <p className="text-sm text-ink/50">No floor plan uploaded.</p>
            )}
          </Section>

          <Section title="Document Vault">
            {!listing.documents || listing.documents.length === 0 ? (
              <p className="text-sm text-ink/50">No verifiable documents uploaded for this listing yet.</p>
            ) : (
              <div className="space-y-2">
                {listing.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-2 rounded-lg border border-line bg-paper/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText size={16} className="shrink-0 text-ink/40" />
                      <div className="min-w-0 overflow-hidden">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-sm font-medium text-navy hover:underline"
                        >
                          {doc.fileName || doc.type.replace('_', ' ')}
                        </a>
                        <span className="text-xs text-ink/45">{doc.type.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={doc.status} />
                      {doc.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => setRejectDocId(doc.id)}
                            className="rounded-md p-1.5 text-danger hover:bg-danger/10"
                            title="Reject document"
                          >
                            <X size={14} />
                          </button>
                          <button
                            onClick={() => verifyDoc(doc.id)}
                            className="rounded-md p-1.5 text-success hover:bg-success/10"
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

            {listing.legalDocumentUrls && listing.legalDocumentUrls.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs text-ink/45">Legacy uploads (pre-Document Vault):</p>
                <div className="flex flex-wrap gap-2">
                  {listing.legalDocumentUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-line bg-white px-2.5 py-1 text-xs text-navy hover:underline"
                    >
                      Document {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>

        <div>
          <Section title="Owner">
            <div className="rounded-lg border border-line bg-paper/60 p-4 text-sm">
              <div className="font-medium text-ink">{listing.owner?.companyName || listing.owner?.name || '—'}</div>
              <div className="mt-0.5 text-ink/60">{listing.owner?.email}</div>
              {listing.owner?.phone && <div className="text-ink/60">{listing.owner.phone}</div>}
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs">
                <span className="text-ink/45">National ID</span>
                {listing.owner?.nationalIdUrl ? (
                  <a href={listing.owner.nationalIdUrl} target="_blank" rel="noreferrer" className="text-navy hover:underline">
                    View submitted ID
                  </a>
                ) : (
                  <span className="text-danger">Not submitted</span>
                )}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink/45">{title}</h2>
      {children}
    </div>
  )
}

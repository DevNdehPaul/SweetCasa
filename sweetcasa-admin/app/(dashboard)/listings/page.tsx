'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText } from 'lucide-react'
import api, { apiErrorMessage } from '@/lib/api'
import type { Listing, ListingStatus } from '@/lib/types'
import { PageHeader, CenteredSpinner, EmptyState, ErrorBanner } from '@/components/ui'
import StatusBadge from '@/components/StatusBadge'

const TABS: { label: string; value: ListingStatus | 'All' }[] = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'All', value: 'All' },
]

function ListingsPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const status = (params.get('status') as ListingStatus | 'All' | null) ?? 'Pending'

  const [listings, setListings] = useState<Listing[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback((s: string) => {
    setListings(null)
    setError(null)
    api
      .get('/listings/admin/all', { params: s === 'All' ? {} : { status: s } })
      .then((res) => setListings(res.data.listings))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load listings.')))
  }, [])

  useEffect(() => {
    load(status)
  }, [status, load])

  function setTab(value: string) {
    router.push(`/listings?status=${value}`)
  }

  return (
    <div>
      <PageHeader title="Listings" subtitle="Review new listings before they go live." />

      <div className="mb-5 flex gap-1 border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setTab(tab.value)}
            className={`border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors ${
              status === tab.value ? 'border-navy text-navy' : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}
      {!listings && !error && <CenteredSpinner />}

      {listings && listings.length === 0 && (
        <EmptyState
          title={`No ${status === 'All' ? '' : status.toLowerCase()} listings`}
          description="New submissions from house owners will show up here."
        />
      )}

      {listings && listings.length > 0 && (
        <div className="overflow-hidden rounded-card border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">Listing</th>
                <th className="px-5 py-3 font-medium">Owner</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Docs</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr
                  key={listing.id}
                  onClick={() => router.push(`/listings/${listing.id}`)}
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-paper/70"
                >
                  <td className="flex items-center gap-3 px-5 py-3">
                    {listing.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.images[0].imageUrl}
                        alt=""
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-line/50 text-ink/30">
                        <FileText size={14} />
                      </div>
                    )}
                    <span className="max-w-[220px] truncate font-medium text-ink">{listing.title}</span>
                  </td>
                  <td className="px-5 py-3 text-ink/70">
                    {listing.owner?.companyName || listing.owner?.name || '—'}
                  </td>
                  <td className="px-5 py-3 text-ink/70">
                    {listing.neighborhood ? `${listing.neighborhood}, ` : ''}
                    {listing.city}
                  </td>
                  <td className="px-5 py-3 font-mono text-ink/70">{Number(listing.price).toLocaleString()} FCFA</td>
                  <td className="px-5 py-3 text-ink/70">{listing.documentCount ?? 0}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={listing.status} />
                  </td>
                  <td className="px-5 py-3 text-ink/50">
                    {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<CenteredSpinner />}>
      <ListingsPageInner />
    </Suspense>
  )
}

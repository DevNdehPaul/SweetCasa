'use client'

import { useEffect, useState, useCallback } from 'react'
import { ScrollText, Building2, FileCheck2, Flag, Users, UserPlus } from 'lucide-react'
import api, { apiErrorMessage } from '@/lib/api'
import type { AuditLogEntry } from '@/lib/types'
import { PageHeader, CenteredSpinner, EmptyState, ErrorBanner } from '@/components/ui'

const ENTITY_TABS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Listings', value: 'Listing' },
  { label: 'Documents', value: 'Document' },
  { label: 'Reports', value: 'Report' },
  { label: 'Users', value: 'User' },
  { label: 'Staff', value: 'StaffInvite' },
]

const ENTITY_ICON: Record<string, typeof Building2> = {
  Listing: Building2,
  Document: FileCheck2,
  Report: Flag,
  User: Users,
  StaffInvite: UserPlus,
}

const ACTION_LABEL: Record<string, string> = {
  LISTING_APPROVED: 'approved listing',
  LISTING_REJECTED: 'rejected listing',
  DOCUMENT_VERIFIED: 'verified document',
  DOCUMENT_REJECTED: 'rejected document',
  REPORT_STATUS_UPDATED: 'updated report status on',
  USER_SUSPENDED: 'suspended user',
  USER_REACTIVATED: 'reactivated user',
  STAFF_INVITED: 'invited staff member',
  STAFF_INVITE_REVOKED: 'revoked invite for',
  STAFF_JOINED: 'joined as staff —',
}

function describe(entry: AuditLogEntry): string {
  const verb = ACTION_LABEL[entry.action] || entry.action.replace(/_/g, ' ').toLowerCase()
  return `${verb} ${entry.entityLabel ? `"${entry.entityLabel}"` : ''}`.trim()
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [entityType, setEntityType] = useState('')

  const load = useCallback((type: string) => {
    setLogs(null)
    setError(null)
    api
      .get('/admin/audit-logs', { params: type ? { entityType: type } : {} })
      .then((res) => setLogs(res.data.logs))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the audit log.')))
  }, [])

  useEffect(() => {
    load(entityType)
  }, [entityType, load])

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Every listing, document, report, and account action taken by admins and staff." />

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {ENTITY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setEntityType(tab.value)}
            className={`shrink-0 border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors ${
              entityType === tab.value ? 'border-navy text-navy' : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}
      {!logs && !error && <CenteredSpinner />}

      {logs && logs.length === 0 && (
        <EmptyState title="No activity yet" description="Approvals, rejections, and account changes will show up here as they happen." />
      )}

      {logs && logs.length > 0 && (
        <div className="space-y-2">
          {logs.map((entry) => {
            const Icon = (entry.entityType && ENTITY_ICON[entry.entityType]) || ScrollText
            const note =
              entry.metadata && typeof entry.metadata === 'object' && 'note' in entry.metadata
                ? String((entry.metadata as Record<string, unknown>).note)
                : entry.metadata && typeof entry.metadata === 'object' && 'reason' in entry.metadata
                ? String((entry.metadata as Record<string, unknown>).reason)
                : null

            return (
              <div key={entry.id} className="flex items-start gap-3 rounded-card border border-line bg-white px-5 py-3.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/10 text-navy">
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">
                    <span className="font-medium">{entry.actorName || 'Someone'}</span>
                    {entry.actorRole && (
                      <span className="ml-1.5 rounded-full bg-paper px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink/50">
                        {entry.actorRole}
                      </span>
                    )}
                    <span className="text-ink/70"> {describe(entry)}</span>
                  </p>
                  {note && <p className="mt-1 truncate text-xs text-ink/50">Note: {note}</p>}
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-ink/40">
                  {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

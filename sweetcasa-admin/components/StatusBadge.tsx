const STYLES: Record<string, string> = {
  Pending: 'bg-gold/10 text-pending border-gold/30',
  Approved: 'bg-success/10 text-success border-success/30',
  Verified: 'bg-success/10 text-success border-success/30',
  Resolved: 'bg-success/10 text-success border-success/30',
  Rejected: 'bg-danger/10 text-danger border-danger/30',
  Reviewed: 'bg-navy/10 text-navy border-navy/30',
}

export default function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] || 'bg-line/40 text-ink border-line'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

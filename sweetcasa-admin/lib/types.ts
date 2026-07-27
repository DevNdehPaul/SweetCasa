export type ListingStatus = 'Pending' | 'Approved' | 'Rejected'
export type DocumentStatus = 'Pending' | 'Verified' | 'Rejected'
export type ReportStatus = 'Pending' | 'Reviewed' | 'Resolved'
export type UserRole = 'BUYER' | 'SELLER' | 'ADMIN' | 'STAFF'
export type UserStatus = 'Active' | 'Suspended'
export type InviteStatus = 'Pending' | 'Accepted' | 'Revoked' | 'Expired'

export interface ListingImage {
  id: number
  imageUrl: string
  isPrimary: boolean | null
}

export interface ListingVideo {
  id: number
  videoUrl: string
  thumbnailUrl: string | null
}

export interface ListingOwner {
  id: number
  name: string | null
  companyName: string | null
  email: string
  phone: string | null
  nationalIdUrl?: string | null
  createdAt?: string | null
}

export interface DocumentRecord {
  id: number
  listingId: number | null
  userId: number | null
  type: 'LEGAL_DOCUMENT' | 'FLOOR_PLAN' | 'NATIONAL_ID' | 'OTHER'
  fileName: string | null
  url: string
  status: DocumentStatus
  reviewedBy: number | null
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string | null
  listing?: { id: number; title: string; status: ListingStatus }
  uploader?: { id: number; name: string | null; email: string }
}

export interface Listing {
  id: number
  ownerId: number | null
  title: string
  price: string
  type: string
  status: ListingStatus
  city: string
  region: string
  neighborhood: string | null
  description: string
  bedrooms: number
  bathrooms: number
  floorPlanUrl: string | null
  legalDocumentUrls: string[] | null
  approvedAt: string | null
  rejectionNote: string | null
  createdAt: string | null
  images: ListingImage[]
  videos: ListingVideo[]
  documents?: DocumentRecord[]
  owner: ListingOwner | null
  documentCount?: number
}

export interface Report {
  id: number
  userId: number | null
  category: string
  subject: string
  description: string
  followUp: boolean
  evidenceUrls: string[] | null
  status: ReportStatus
  createdAt: string | null
  user: { id: number; name: string | null; email: string; role: UserRole } | null
}

export interface AdminUserListingSummary {
  id: number
  title: string
  status: ListingStatus
  price: string
  city: string
  createdAt: string | null
}

export interface AdminUser {
  id: number
  name: string | null
  companyName: string | null
  email: string
  phone: string | null
  role: UserRole
  status: UserStatus
  suspendedAt: string | null
  suspensionReason: string | null
  country: string | null
  region: string | null
  city: string | null
  nationalIdUrl: string | null
  idVerified: boolean
  listingCount: number
  createdAt: string | null
  listings?: AdminUserListingSummary[]
}

export interface AuditLogEntry {
  id: number
  actorId: number | null
  actorName: string | null
  actorRole: UserRole | null
  action: string
  entityType: string | null
  entityId: number | null
  entityLabel: string | null
  metadata: Record<string, unknown> | null
  createdAt: string | null
}

export interface StaffInvite {
  id: number
  email: string
  role: UserRole
  status: InviteStatus
  invitedBy: number | null
  expiresAt: string
  acceptedAt: string | null
  createdAt: string | null
}

export interface Stats {
  listings: { pending: number; approved: number; rejected: number }
  documents: { pending: number }
  reports: { pending: number }
  users: { total: number; sellers: number; buyers: number; suspended: number }
  invites: { pending: number }
}

export interface AdminProfile {
  id: number
  name: string
  email: string
  role: UserRole
}

export type ListingStatus = 'Pending' | 'Approved' | 'Rejected'
export type DocumentStatus = 'Pending' | 'Verified' | 'Rejected'
export type ReportStatus = 'Pending' | 'Reviewed' | 'Resolved'
export type UserRole = 'BUYER' | 'SELLER' | 'ADMIN'

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

export interface AdminUser {
  id: number
  name: string | null
  companyName: string | null
  email: string
  phone: string | null
  role: UserRole
  country: string | null
  region: string | null
  city: string | null
  nationalIdUrl: string | null
  idVerified: boolean
  listingCount: number
  createdAt: string | null
}

export interface Stats {
  listings: { pending: number; approved: number; rejected: number }
  documents: { pending: number }
  reports: { pending: number }
  users: { total: number; sellers: number; buyers: number }
}

export interface AdminProfile {
  id: number
  name: string
  email: string
  role: UserRole
}

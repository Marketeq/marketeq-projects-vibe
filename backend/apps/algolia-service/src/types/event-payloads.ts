export interface ListingEventPayload {
  id: string
  type: 'project' | 'service'
  ownerId: string
  createdAt: string
  rating: number | null

  // Common text fields
  title: string
  description: string | null
  skills: string[]
  category: string | null
  industry: string | null
  tags: string[]

  // Media
  mediaUrls: string[]

  // Project-specific
  subtitle: string | null
  overview: string | null
  technologies: string[]
  subcategories: string[]
  projectLead: string | null
  deliverables: string | null
  projectType: string | null
  budgetMin: number | null
  budgetMax: number | null
  projectDurationRange: string | null
  teamSizeRange: string | null
  additionalTags: string[]
  timeline: string | null

  // Service-specific
  pricingModel: string | null
  deliveryTime: string | null
  priceMin: number | null
  priceMax: number | null

  // G5 listing-owner gate. `ownerGateOpen` is listings-service's last known gate
  // for `ownerId`. A listing WITH an owner is indexed hidden (`owner_hidden`)
  // unless that gate is known open; a listing with no owner is never hidden.
  ownerGateOpen?: boolean
}

export interface ListingDeletedPayload {
  id: string
  type: string
}

export interface TalentEventPayload {
  id: string            // externalId — used as Algolia objectID
  name: string
  username: string
  createdAt: string | null
  headline: string | null
  skills: string[]
  location: string | null
  industries: string[]
  categories: string[]
  subcategories: string[]
  hourlyRateMin: number | null
  hourlyRateMax: number | null
  availability: string | null
  languages: string[]
  certifications: string[]
  overview: string | null
  tags: string[]
  experienceLevel: string | null
  rating: number | null
  avatarUrl: string | null
  projectHighlights: string[]
  // System-generated stats owned by user-service (never written by CMS sync).
  // They back the Talent sidebar's Projects Completed / Average Rating /
  // Client Success Rate filters and the numbers on the result card, so they
  // have to travel with the profile rather than being recomputed downstream.
  country: string | null
  timezone: string | null
  projectsCompleted: number | null
  reviewsCount: number | null
  clientSuccessRate: number | null
  // Total years of professional experience, derived from the profile's work
  // history at sync time. Indexed as a number so the sidebar's year-bucket
  // filters (Junior 1-3, Middle 3-5, …) become plain numeric range queries
  // instead of needing an exact-match label agreed on by both sides.
  yearsOfExperience: number | null
  // G1 discovery gate. `accountId` is the platform account that owns the
  // profile (the id identity-verification keys its decision on); it is indexed
  // as `account_id` so a gate change can find the record. `gateOpen` is the
  // gate decision the sender obtained from identity-verification-service at
  // `gateCheckedAt`. Both are optional on purpose: when the sender could not
  // get a decision it omits `gateOpen`, the record's existing `gate_open` is
  // left untouched, and a record that never had one stays hidden.
  accountId?: string | null
  gateOpen?: boolean
  gateCheckedAt?: string
}

// identity-verification-service -> here, whenever an account's gate_open may
// have changed (verification approved/lost, grace entered/expired, duplicate
// document block, ...). Carries the decision only, never a status or reason.
export interface GateChangedPayload {
  userId: string
  gateOpen: boolean
  occurredAt: string
}

// user-service -> here: the repeatable backfill/reconcile. One entry per
// talent record (`id` = the record's objectID).
export interface TalentGateBackfillPayload {
  entries: Array<{ id: string; accountId: string; gateOpen: boolean }>
  checkedAt: string
}

// listings-service -> here: the repeatable backfill/reconcile of the listing-owner
// gate (G5). One entry per listing record (`id` = objectID in `index`).
export interface ListingOwnerGateBackfillPayload {
  entries: Array<{ index: 'projects' | 'services' | 'teams'; id: string; ownerId: string; ownerGateOpen: boolean }>
  checkedAt: string
}

export interface TalentDeletedPayload {
  id: string
}

export interface TeamEventPayload {
  id: string            // Algolia objectID
  // G5: the account that owns the team and listings-service's last known gate for it.
  ownerId?: string | null
  ownerGateOpen?: boolean
  teamName: string
  createdAt: string | null
  username: string | null
  category: string | null
  services: string[]
  skills: string[]
  location: string | null
  tags: string[]
  industries: string[]
  hourlyRate: number | null
  teamSizeRange: string | null
  rating: number | null
  projectsCompleted: number | null
  clientSuccessRate: number | null
  availability: string | null
  languages: string[]
  description: string | null
  specialties: string[]
  stack: string[]
  featuredProjects: string | null
  memberAvatars: string[]
  memberCount: number | null
}

export interface TeamDeletedPayload {
  id: string
}

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
}

export interface TalentDeletedPayload {
  id: string
}

export interface TeamEventPayload {
  id: string            // Algolia objectID
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

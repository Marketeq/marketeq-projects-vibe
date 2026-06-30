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
  headline: string | null
  skills: string[]
  location: string | null
  industries: string[]
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
}

export interface TalentDeletedPayload {
  id: string
}

export interface TeamEventPayload {
  id: string            // Algolia objectID
  teamName: string
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

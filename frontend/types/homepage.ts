export interface ProjectCard {
  id: string
  title: string
  slug: string | null
  description: string
  shortDescription: string | null
  thumbnail: string | null
  budget: number | null
  duration: string | null
  categories: string[]
  skills: string[]
  tags: string[]
  createdAt: string
  rating?: number
  reviewCount?: number
  completionsCount?: number
  views90d?: number
  adminBoost?: number
  featured?: boolean
  collaborators?: string[]
}

export interface ServiceCard {
  id: string
  title: string
  slug: string | null
  description: string
  shortDescription: string | null
  thumbnail: string | null
  priceMin: number | null
  priceMax: number | null
  deliveryTime: string | null
  categories: string[]
  skills: string[]
  tags: string[]
  createdAt: string
  rating?: number
  reviewCount?: number
  completionsCount?: number
  views90d?: number
  adminBoost?: number
  featured?: boolean
  collaborators?: string[]
}

export interface TeamCard {
  id: string
  name: string
  slug: string | null
  logo: string | null
  memberCount: number
  rating: number
  specializations: string[]
  completedProjects: number
  createdAt: string
}

export interface TalentCard {
  id: string
  username: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  title: string | null
  location: string | null
  rateMin: number | null
  rateMax: number | null
  skills: string[]
  createdAt: string
}

export interface BlockPagination {
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

export interface HomepageBlock {
  key: string
  type: "grid" | "carousel"
  entity: "projects" | "services" | "teams" | "talent"
  items: (ProjectCard | ServiceCard | TeamCard | TalentCard)[]
  pagination?: BlockPagination
  tabSlug?: string
  tabLabel?: string
}

export interface HomepageSection {
  key: string
  title: string
  subtitle: string
  ctaLabel: string | null
  ctaUrl: string | null
  blocks: HomepageBlock[]
}

export interface HomepageHeroSlide {
  eyebrow: string
  title: string
  description: string
  ctaLabel: string
  ctaUrl: string
  image: string
  accent?: string
}

export interface HomepageHero {
  slides: HomepageHeroSlide[]
  intervalMs?: number
  // Legacy single-slide fields (kept for CMS backwards-compat)
  headline?: string
  subheadline?: string
  backgroundImage?: string
  ctaLabel?: string
  ctaUrl?: string
}

export interface HomepageBanner {
  enabled: boolean
  message: string | null
  ctaLabel: string | null
  ctaUrl: string | null
  expiresAt: string | null
  bannerType: "info" | "promo" | "warning"
}

export interface HomepageSeo {
  metaTitle: string
  metaDescription: string
  canonical: string | null
  ogImage: string | null
  noindex: boolean
}

export interface CategoryRef {
  name: string
  slug: string
  iconUrl: string | null
}

export interface FooterNavColumn {
  heading: string
  links: { label: string; url: string }[]
}

export interface TalentNetworkCta {
  headline: string
  description: string
  ctaLabel: string
  ctaUrl: string
}

export interface HomepagePayload {
  title: string
  slug: string
  status: "active" | "testing" | "draft"
  hero: HomepageHero
  banner: HomepageBanner | null
  sections: HomepageSection[]
  popularTabs: CategoryRef[]
  moreCategoriesList: CategoryRef[]
  talentNetworkCta: TalentNetworkCta
  footerNav: FooterNavColumn[]
  seo: HomepageSeo
  generatedAt: string
}

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
}

export interface HomepageBlock {
  key: string
  type: "grid" | "carousel"
  entity: "projects" | "services"
  items: (ProjectCard | ServiceCard)[]
}

export interface HomepageSection {
  key: string
  title: string
  subtitle: string
  ctaLabel: string | null
  ctaUrl: string | null
  blocks: HomepageBlock[]
}

export interface HomepageHero {
  headline: string
  subheadline: string
  backgroundImage: string
  ctaLabel: string
  ctaUrl: string
}

export interface CategoryRef {
  name: string
  slug: string
  iconUrl: string | null
}

export interface TalentNetworkCta {
  headline: string
  description: string
  ctaLabel: string
  ctaUrl: string
}

export interface HomepagePayload {
  hero: HomepageHero
  sections: HomepageSection[]
  popularTabs: CategoryRef[]
  moreCategoriesList: CategoryRef[]
  talentNetworkCta: TalentNetworkCta
  generatedAt: string
}

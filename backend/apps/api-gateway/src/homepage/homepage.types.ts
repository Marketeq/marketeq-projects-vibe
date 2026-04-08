// ── Shared types for the homepage assembly endpoint ─────────────────────────

/** Card shape returned for project listings */
export interface ProjectCard {
  id: string;
  title: string;
  slug: string | null;
  description: string;
  shortDescription: string | null;
  thumbnail: string | null;     // first mediaUrl or null
  budget: number | null;
  duration: string | null;
  categories: string[];
  skills: string[];
  tags: string[];
  createdAt: string;
}

/** Card shape returned for service listings */
export interface ServiceCard {
  id: string;
  title: string;
  slug: string | null;
  description: string;
  shortDescription: string | null;
  thumbnail: string | null;
  priceMin: number | null;
  priceMax: number | null;
  deliveryTime: string | null;
  categories: string[];
  skills: string[];
  tags: string[];
  createdAt: string;
}

/** A single content block inside a section */
export interface HomepageBlock {
  key: string;
  type: 'grid' | 'carousel';
  entity: 'projects' | 'services';
  items: (ProjectCard | ServiceCard)[];
}

/** A homepage section containing one or more blocks */
export interface HomepageSection {
  key: string;
  title: string;
  subtitle: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  blocks: HomepageBlock[];
}

/** Hero section */
export interface HomepageHero {
  headline: string;
  subheadline: string;
  backgroundImage: string;
  ctaLabel: string;
  ctaUrl: string;
}

/** Category reference for "More Categories" */
export interface CategoryRef {
  name: string;
  slug: string;
  iconUrl: string | null;
}

/** Talent Network CTA */
export interface TalentNetworkCta {
  headline: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
}

/** Full homepage API response */
export interface HomepagePayload {
  hero: HomepageHero;
  sections: HomepageSection[];
  /** Tabs shown above the "Most Popular" section */
  popularTabs: CategoryRef[];
  /** "More Categories" tile grid */
  moreCategoriesList: CategoryRef[];
  talentNetworkCta: TalentNetworkCta;
  generatedAt: string;
}

// ── Section configuration (replaces CMS later) ─────────────────────────────

export interface SectionConfig {
  key: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaUrl?: string;
  blocks: {
    entity: 'projects' | 'services';
    type: 'grid' | 'carousel';
    /** Max items to include */
    limit: number;
    /** How to sort the data */
    sort: 'newest' | 'random';
    /** Optional category filter */
    categoryFilter?: string;
  }[];
}

// ── Shared types for the homepage assembly endpoint ─────────────────────────

/** Card shape returned for project listings */
export interface ProjectCard {
  id: string;
  title: string;
  slug: string | null;
  description: string;
  shortDescription: string | null;
  thumbnail: string | null;
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

/** Pagination metadata for a block */
export interface BlockPagination {
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/** A single content block inside a section */
export interface HomepageBlock {
  key: string;
  type: 'grid' | 'carousel';
  entity: 'projects' | 'services';
  items: (ProjectCard | ServiceCard)[];
  pagination?: BlockPagination;
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

/** Promotional banner — sourced from CMS HomepageBanner global */
export interface HomepageBanner {
  enabled: boolean;
  message: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  expiresAt: string | null;
  bannerType: 'info' | 'promo' | 'warning';
}

/** SEO metadata */
export interface HomepageSeo {
  metaTitle: string;
  metaDescription: string;
  canonical: string | null;
  ogImage: string | null;
  noindex: boolean;
}

/** Category reference for "More Categories" */
export interface CategoryRef {
  name: string;
  slug: string;
  iconUrl: string | null;
}

/** Footer navigation column */
export interface FooterNavColumn {
  heading: string;
  links: { label: string; url: string }[];
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
  /** Internal title of this homepage document */
  title: string;
  /** URL slug of this homepage (e.g. "home") */
  slug: string;
  /** Document status: active, testing, or draft (preview only) */
  status: 'active' | 'testing' | 'draft';
  hero: HomepageHero;
  /** Promotional banner — null when disabled or expired */
  banner: HomepageBanner | null;
  sections: HomepageSection[];
  popularTabs: CategoryRef[];
  moreCategoriesList: CategoryRef[];
  talentNetworkCta: TalentNetworkCta;
  footerNav: FooterNavColumn[];
  seo: HomepageSeo;
  generatedAt: string;
}

/** Max description length for card summaries */
export const CARD_DESCRIPTION_MAX_LENGTH = 120;
/** Carousel minimum: only render carousel if items >= gridSize * CAROUSEL_MIN_PAGES */
export const CAROUSEL_MIN_PAGES = 3;
export const GRID_SIZE = 4;

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
    limit: number;
    sort: 'newest' | 'random';
    categoryFilter?: string;
  }[];
}

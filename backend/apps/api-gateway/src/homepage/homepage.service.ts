import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import {
  HomepagePayload,
  HomepageSection,
  HomepageBlock,
  HomepageBanner,
  HomepageHero,
  HomepageSeo,
  CategoryRef,
  TalentNetworkCta,
  FooterNavColumn,
  ProjectCard,
  ServiceCard,
  SectionConfig,
} from './homepage.types';
import {
  HOMEPAGE_HERO,
  HOMEPAGE_SECTIONS,
  HOMEPAGE_POPULAR_TABS,
  HOMEPAGE_MORE_CATEGORIES,
  HOMEPAGE_TALENT_CTA,
  HOMEPAGE_FOOTER_NAV,
  HOMEPAGE_SEO,
} from './homepage.config';

interface GetHomepageOptions {
  variant?: string;
  preview?: boolean;
  previewToken?: string;
}

@Injectable()
export class HomepageService {
  private readonly logger = new Logger(HomepageService.name);
  private readonly listingsUrl: string;
  private readonly cmsUrl: string | null;
  private readonly previewSecret: string | null;
  private readonly cacheTtl: number;
  private redis: Redis | null = null;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.listingsUrl =
      config.get<string>('LISTINGS_SERVICE_URL') || 'http://localhost:3004';
    this.cmsUrl = config.get<string>('CMS_SERVICE_URL') || null;
    this.previewSecret = config.get<string>('PREVIEW_SECRET') || null;
    this.cacheTtl = config.get<number>('HOMEPAGE_CACHE_TTL') || 300;

    const redisUrl = config.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
          retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000)),
        });
        this.redis.on('error', (err) => {
          this.logger.warn(`Redis error: ${err.message}`);
        });
      } catch (err: any) {
        this.logger.warn(`Redis init failed — caching disabled: ${err.message}`);
        this.redis = null;
      }
    }
  }

  /**
   * Assemble the full homepage payload.
   *
   * 1. If preview mode, bypass cache and fetch draft from CMS
   * 2. Check Redis cache (key: hp:{slug}:{variant})
   * 3. On miss, fetch CMS config (with static fallback), assemble, cache
   */
  async getHomepage(options: GetHomepageOptions = {}): Promise<HomepagePayload> {
    const { variant, preview, previewToken } = options;

    // Preview mode — bypass cache, validate token
    if (preview) {
      if (!this.previewSecret || previewToken !== this.previewSecret) {
        throw new NotFoundException('Invalid preview token');
      }
      return this.assembleHomepage(variant, true);
    }

    // Check cache — use "default" when no variant to avoid empty-string collisions
    const cacheKey = `hp:home:${variant || 'default'}`;
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err: any) {
        this.logger.warn(`Redis read failed: ${err.message}`);
      }
    }

    // Assemble fresh
    const payload = await this.assembleHomepage(variant, false);

    // Write to cache
    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, this.cacheTtl, JSON.stringify(payload));
      } catch (err: any) {
        this.logger.warn(`Redis write failed: ${err.message}`);
      }
    }

    return payload;
  }

  /**
   * Invalidate all cached homepage variants for a given slug.
   * Called by the RabbitMQ consumer on homepage.saved / homepage.deleted events.
   */
  async invalidateCache(_slug: string): Promise<void> {
    if (!this.redis) return;
    try {
      // Cache keys use hp:home:{variant} — always invalidate all homepage variants
      const pattern = `hp:home:*`;
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redis.del(...keys);
          this.logger.log(`Invalidated ${keys.length} cache keys for pattern ${pattern}`);
        }
      } while (cursor !== '0');
    } catch (err: any) {
      this.logger.warn(`Cache invalidation failed: ${err.message}`);
    }
  }

  // ── Assembly ──────────────────────────────────────────────────────────────

  private async assembleHomepage(variant?: string, isDraft = false): Promise<HomepagePayload> {
    // Fetch CMS config, listings, and banner in parallel
    const [cmsConfig, allProjects, allServices, banner] = await Promise.all([
      this.fetchCmsHomepage(variant, isDraft),
      this.fetchProjects(),
      this.fetchServices(),
      this.fetchBanner(),
    ]);

    // Use CMS config if available, otherwise static defaults
    const hero: HomepageHero = cmsConfig?.hero ?? HOMEPAGE_HERO;
    const sectionConfigs: SectionConfig[] = cmsConfig?.sections ?? HOMEPAGE_SECTIONS;
    const popularTabs: CategoryRef[] = cmsConfig?.popularTabs ?? HOMEPAGE_POPULAR_TABS;
    const moreCategoriesList: CategoryRef[] = cmsConfig?.moreCategoriesList ?? HOMEPAGE_MORE_CATEGORIES;
    const talentNetworkCta: TalentNetworkCta = cmsConfig?.talentNetworkCta ?? HOMEPAGE_TALENT_CTA;
    const footerNav: FooterNavColumn[] = cmsConfig?.footerNav ?? HOMEPAGE_FOOTER_NAV;
    const seo: HomepageSeo = cmsConfig?.seo ?? HOMEPAGE_SEO;

    // Deduplicate across sections
    const usedProjectIds = new Set<string>();
    const usedServiceIds = new Set<string>();
    const sections: HomepageSection[] = [];

    for (const sectionCfg of sectionConfigs) {
      const section = this.assembleSection(
        sectionCfg, allProjects, allServices, usedProjectIds, usedServiceIds,
      );
      if (section.blocks.some((b) => b.items.length > 0)) {
        sections.push(section);
      }
    }

    return {
      hero,
      banner,
      sections,
      popularTabs,
      moreCategoriesList,
      talentNetworkCta,
      footerNav,
      seo,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── CMS fetch ─────────────────────────────────────────────────────────────

  /**
   * Fetch homepage config from CMS Homepages collection.
   * Resolves A/B variant or falls back to default.
   * Returns null if CMS is unavailable (static fallback will be used).
   */
  private async fetchCmsHomepage(
    variant?: string,
    isDraft = false,
  ): Promise<CmsHomepageConfig | null> {
    if (!this.cmsUrl) return null;

    try {
      // Try variant first (testing status + matching testGroup)
      if (variant?.trim()) {
        const variantResult = await this.queryCmsHomepages({
          'where[status][equals]': 'testing',
          'where[testGroup][equals]': variant,
        });
        if (variantResult) return this.transformCmsHomepage(variantResult);
      }

      // Fall back to default active homepage
      const status = isDraft ? 'draft' : 'active';
      const defaultResult = await this.queryCmsHomepages({
        'where[status][equals]': status,
        'where[isDefault][equals]': 'true',
      });

      if (defaultResult) return this.transformCmsHomepage(defaultResult);

      // Try any active homepage if no default is set
      if (!isDraft) {
        const anyActive = await this.queryCmsHomepages({
          'where[status][equals]': 'active',
        });
        if (anyActive) return this.transformCmsHomepage(anyActive);
      }

      return null;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch homepage config from CMS: ${err.message}`);
      return null;
    }
  }

  private async queryCmsHomepages(params: Record<string, string>): Promise<any | null> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.cmsUrl}/api/homepages`, {
        params: { limit: 1, depth: 1, ...params },
        timeout: 3000,
      }),
    );
    return data?.docs?.[0] || null;
  }

  private transformCmsHomepage(doc: any): CmsHomepageConfig {
    const hero: HomepageHero | undefined = doc.hero?.headline
      ? {
          headline: doc.hero.headline,
          subheadline: doc.hero.subheadline || '',
          backgroundImage: (typeof doc.hero.backgroundImage === 'object' ? doc.hero.backgroundImage?.url : doc.hero.backgroundImage) || '/sending-emails.png',
          ctaLabel: doc.hero.ctaLabel || 'Browse Projects',
          ctaUrl: doc.hero.ctaUrl || '/c/development',
        }
      : undefined;

    const sections: SectionConfig[] | undefined = doc.sections?.length
      ? doc.sections.map((s: any) => ({
          key: s.key,
          title: s.title,
          subtitle: s.subtitle || '',
          ctaLabel: s.ctaLabel,
          ctaUrl: s.ctaUrl,
          blocks: (s.blocks || []).map((b: any) => ({
            entity: b.entity,
            type: b.displayType || 'carousel',
            limit: b.limit || 8,
            sort: b.sort || 'newest',
            categoryFilter: b.categoryFilter,
          })),
        }))
      : undefined;

    const popularTabs: CategoryRef[] | undefined = doc.popularTabs?.length
      ? doc.popularTabs.map((t: any) => ({ name: t.name, slug: t.slug, iconUrl: t.iconUrl || null }))
      : undefined;

    const moreCategoriesList: CategoryRef[] | undefined = doc.moreCategoriesList?.length
      ? doc.moreCategoriesList.map((c: any) => ({ name: c.name, slug: c.slug, iconUrl: c.iconUrl || null }))
      : undefined;

    const talentNetworkCta: TalentNetworkCta | undefined =
      doc.talentNetworkCta?.headline
        ? {
            headline: doc.talentNetworkCta.headline,
            description: doc.talentNetworkCta.description || '',
            ctaLabel: doc.talentNetworkCta.ctaLabel || '',
            ctaUrl: doc.talentNetworkCta.ctaUrl || '',
          }
        : undefined;

    const footerNav: FooterNavColumn[] | undefined = doc.footerNav?.length
      ? doc.footerNav.map((col: any) => ({
          heading: col.heading,
          links: (col.links || []).map((l: any) => ({ label: l.label, url: l.url })),
        }))
      : undefined;

    const seo: HomepageSeo | undefined = doc.seo?.metaTitle
      ? {
          metaTitle: doc.seo.metaTitle,
          metaDescription: doc.seo.metaDescription || '',
          canonical: doc.seo.canonical || null,
          ogImage: doc.seo.ogImage?.url || null,
          noindex: doc.seo.noindex || false,
        }
      : undefined;

    return { hero, sections, popularTabs, moreCategoriesList, talentNetworkCta, footerNav, seo };
  }

  // ── Banner ────────────────────────────────────────────────────────────────

  private async fetchBanner(): Promise<HomepageBanner | null> {
    if (!this.cmsUrl) return null;

    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.cmsUrl}/api/globals/homepage-banner`, { timeout: 3000 }),
      );

      if (!data?.enabled) return null;
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) return null;

      return {
        enabled: true,
        message: data.message ?? null,
        ctaLabel: data.ctaLabel ?? null,
        ctaUrl: data.ctaUrl ?? null,
        expiresAt: data.expiresAt ?? null,
        bannerType: data.bannerType ?? 'info',
      };
    } catch (err: any) {
      this.logger.warn(`Failed to fetch homepage banner from CMS: ${err.message}`);
      return null;
    }
  }

  // ── Listings ──────────────────────────────────────────────────────────────

  private assembleSection(
    cfg: SectionConfig,
    allProjects: ProjectCard[],
    allServices: ServiceCard[],
    usedProjectIds: Set<string>,
    usedServiceIds: Set<string>,
  ): HomepageSection {
    const blocks: HomepageBlock[] = [];

    for (const blockCfg of cfg.blocks) {
      let items: (ProjectCard | ServiceCard)[];

      if (blockCfg.entity === 'projects') {
        const available = allProjects.filter((p) => !usedProjectIds.has(p.id));
        items = available.slice(0, blockCfg.limit);
        items.forEach((i) => usedProjectIds.add(i.id));
      } else {
        const available = allServices.filter((s) => !usedServiceIds.has(s.id));
        items = available.slice(0, blockCfg.limit);
        items.forEach((i) => usedServiceIds.add(i.id));
      }

      blocks.push({
        key: `${cfg.key}-${blockCfg.entity}`,
        type: blockCfg.type,
        entity: blockCfg.entity,
        items,
      });
    }

    return {
      key: cfg.key,
      title: cfg.title,
      subtitle: cfg.subtitle,
      ctaLabel: cfg.ctaLabel ?? null,
      ctaUrl: cfg.ctaUrl ?? null,
      blocks,
    };
  }

  private async fetchProjects(): Promise<ProjectCard[]> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.listingsUrl}/v1/projects`, { timeout: 5000 }),
      );
      return (Array.isArray(data) ? data : []).map((p: any) => this.toProjectCard(p));
    } catch (err: any) {
      this.logger.warn(`Failed to fetch projects: ${err.message}`);
      return [];
    }
  }

  private async fetchServices(): Promise<ServiceCard[]> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.listingsUrl}/v1/services`, { timeout: 5000 }),
      );
      return (Array.isArray(data) ? data : []).map((s: any) => this.toServiceCard(s));
    } catch (err: any) {
      this.logger.warn(`Failed to fetch services: ${err.message}`);
      return [];
    }
  }

  private toProjectCard(raw: any): ProjectCard {
    return {
      id: raw.id,
      title: raw.title ?? '',
      slug: raw.slug ?? null,
      description: raw.description ?? '',
      shortDescription: raw.shortDescription ?? null,
      thumbnail: raw.mediaUrls?.[0] ?? null,
      budget: raw.budget != null ? Number(raw.budget) : null,
      duration: raw.duration ?? null,
      categories: raw.categories ?? [],
      skills: raw.skills ?? [],
      tags: raw.tags ?? [],
      createdAt: raw.createdAt,
    };
  }

  private toServiceCard(raw: any): ServiceCard {
    return {
      id: raw.id,
      title: raw.title ?? '',
      slug: raw.slug ?? null,
      description: raw.description ?? '',
      shortDescription: raw.shortDescription ?? null,
      thumbnail: raw.mediaUrls?.[0] ?? null,
      priceMin: raw.priceMin != null ? Number(raw.priceMin) : null,
      priceMax: raw.priceMax != null ? Number(raw.priceMax) : null,
      deliveryTime: raw.deliveryTime ?? null,
      categories: raw.categories ?? [],
      skills: raw.skills ?? [],
      tags: raw.tags ?? [],
      createdAt: raw.createdAt,
    };
  }
}

/** Internal type for CMS homepage config — all fields optional (partial override of defaults) */
interface CmsHomepageConfig {
  hero?: HomepageHero;
  sections?: SectionConfig[];
  popularTabs?: CategoryRef[];
  moreCategoriesList?: CategoryRef[];
  talentNetworkCta?: TalentNetworkCta;
  footerNav?: FooterNavColumn[];
  seo?: HomepageSeo;
}

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
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
  ScoringFields,
  ProjectCard,
  ServiceCard,
  TeamCard,
  TalentCard,
  SectionConfig,
  CARD_DESCRIPTION_MAX_LENGTH,
  CAROUSEL_MIN_PAGES,
  GRID_SIZE,
} from './homepage.types';
import { evaluateItems } from './homepage.evaluator';
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
  private readonly userServiceUrl: string;
  private readonly cmsUrl: string | null;
  private readonly previewSecret: string | null;
  private readonly cacheTtl: number;
  private redis: Redis | null = null;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.listingsUrl =
      config.get<string>('LISTINGS_SERVICE_URL') || 'http://localhost:3004';
    this.userServiceUrl =
      config.get<string>('USER_SERVICE_URL') || 'http://localhost:3002';
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
    const startedAt = Date.now();

    // Preview mode — bypass cache, validate token
    if (preview) {
      if (!this.previewSecret || previewToken !== this.previewSecret) {
        throw new ForbiddenException('Invalid or missing preview token');
      }
      const payload = await this.assembleHomepage(variant, true);
      this.logger.log(
        `homepage assembled (preview, variant=${variant ?? 'default'}) in ${Date.now() - startedAt}ms`,
      );
      return payload;
    }

    // Check cache — use "default" when no variant to avoid empty-string collisions
    const cacheKey = `hp:home:${variant || 'default'}`;
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.logger.debug(`homepage cache HIT (${cacheKey}) in ${Date.now() - startedAt}ms`);
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

    this.logger.log(
      `homepage cache MISS (${cacheKey}) — assembled in ${Date.now() - startedAt}ms`,
    );
    return payload;
  }

  /** Lightweight health check — reports Redis connectivity. */
  async healthCheck(): Promise<{ status: 'ok'; redis: 'up' | 'down' | 'disabled' }> {
    let redisStatus: 'up' | 'down' | 'disabled' = 'disabled';
    if (this.redis) {
      try {
        const pong = await this.redis.ping();
        redisStatus = pong === 'PONG' ? 'up' : 'down';
      } catch {
        redisStatus = 'down';
      }
    }
    return { status: 'ok', redis: redisStatus };
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
      let iterations = 0;
      do {
        if (++iterations > 100) {
          this.logger.warn('Cache invalidation exceeded max iterations, aborting scan');
          break;
        }
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
    const [cmsResult, allProjects, allServices, allTeams, allTalent, banner] = await Promise.all([
      this.fetchCmsHomepage(variant, isDraft),
      this.fetchProjects(),
      this.fetchServices(),
      this.fetchTeams(),
      this.fetchTalent(),
      this.fetchBanner(),
    ]);

    const cmsConfig = cmsResult?.config ?? null;
    const cmsMeta = cmsResult?.meta ?? { title: 'Marketeq Home', slug: 'home', status: isDraft ? 'draft' as const : 'active' as const };

    // CMS is the source of truth. Static config only runs as an emergency
    // fallback when the CMS is unreachable or has no published homepage.
    // Collect per-field misses so operators see which pieces of content the
    // CMS is not yet providing.
    const missingFromCms: string[] = [];
    const pickCms = <T>(value: T | null | undefined, fallback: T, field: string): T => {
      if (value == null) {
        missingFromCms.push(field);
        return fallback;
      }
      return value;
    };

    const hero = pickCms(cmsConfig?.hero, HOMEPAGE_HERO, 'hero');
    const sectionConfigs = pickCms(cmsConfig?.sections, HOMEPAGE_SECTIONS, 'sections');
    const popularTabs = pickCms(cmsConfig?.popularTabs, HOMEPAGE_POPULAR_TABS, 'popularTabs');
    const moreCategoriesList = pickCms(
      cmsConfig?.moreCategoriesList,
      HOMEPAGE_MORE_CATEGORIES,
      'moreCategoriesList',
    );
    const talentNetworkCta = pickCms(
      cmsConfig?.talentNetworkCta,
      HOMEPAGE_TALENT_CTA,
      'talentNetworkCta',
    );
    const footerNav = pickCms(cmsConfig?.footerNav, HOMEPAGE_FOOTER_NAV, 'footerNav');
    let seo = pickCms(cmsConfig?.seo, HOMEPAGE_SEO, 'seo');

    if (missingFromCms.length > 0) {
      this.logger.warn(
        `CMS did not provide [${missingFromCms.join(', ')}] — falling back to static config. Seed the Homepages collection to fix.`,
      );
    }

    // Force noindex for preview/draft content so search engines don't index it
    if (isDraft) {
      seo = { ...seo, noindex: true };
    }

    const usedIds = new Set<string>();
    const sections: HomepageSection[] = [];
    const pinnedMap = cmsConfig?.pinnedItems ?? {};

    for (const sectionCfg of sectionConfigs) {
      const section = this.assembleSection(
        sectionCfg, allProjects, allServices, allTeams, allTalent,
        usedIds, pinnedMap[sectionCfg.key],
      );
      if (section.blocks.some((b) => b.items.length > 0)) {
        sections.push(section);
      }
    }

    return {
      title: cmsMeta.title,
      slug: cmsMeta.slug,
      status: cmsMeta.status,
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
  ): Promise<CmsHomepageResult | null> {
    if (!this.cmsUrl) return null;

    try {
      let doc: any = null;

      // Try variant first (testing status + matching testGroup)
      if (variant?.trim()) {
        doc = await this.queryCmsHomepages({
          'where[status][equals]': 'testing',
          'where[testGroup][equals]': variant,
        });
      }

      // Fall back to default active/draft homepage
      if (!doc) {
        const status = isDraft ? 'draft' : 'active';
        doc = await this.queryCmsHomepages({
          'where[status][equals]': status,
          'where[isDefault][equals]': 'true',
        });
      }

      // Try any active homepage if no default is set
      if (!doc && !isDraft) {
        doc = await this.queryCmsHomepages({
          'where[status][equals]': 'active',
        });
      }

      if (!doc) {
        // CMS reachable but no matching homepage document — distinct from
        // an API/network error so operators can seed instead of debugging.
        this.logger.warn(
          `CMS returned no Homepages doc (variant=${variant ?? 'none'}, isDraft=${isDraft}). ` +
            `Run 'npm run seed:homepage' in cms-service to create the default 'home' document.`,
        );
        return null;
      }

      return {
        meta: {
          title: doc.title || 'Marketeq Home',
          slug: doc.slug || 'home',
          status: doc.status || 'active',
        },
        config: this.transformCmsHomepage(doc),
      };
    } catch (err: any) {
      this.logger.warn(
        `CMS request failed for Homepages (variant=${variant ?? 'none'}): ${err.message}`,
      );
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
    let hero: HomepageHero | undefined;
    // Multi-slide hero (preferred) — CMS hero.slides array
    if (Array.isArray(doc.hero?.slides) && doc.hero.slides.length > 0) {
      hero = {
        intervalMs: doc.hero.intervalMs || 7000,
        slides: doc.hero.slides.map((s: any, idx: number) => {
          // Resolution order: Media upload → imageUrl fallback → legacy
          // backgroundImage → hardcoded default.
          const resolvedImage =
            (typeof s.image === 'object' ? s.image?.url : s.image) ||
            s.imageUrl ||
            (typeof s.backgroundImage === 'object' ? s.backgroundImage?.url : s.backgroundImage);
          // Warn — but don't fail — when CMS slides are missing critical fields
          // so authors can fix the data instead of silently shipping fallbacks.
          const missing: string[] = [];
          if (!s.title && !s.headline) missing.push('title');
          if (!resolvedImage) missing.push('image');
          if (!s.ctaUrl) missing.push('ctaUrl');
          if (missing.length > 0) {
            this.logger.warn(
              `CMS hero slide ${idx} missing required fields: ${missing.join(', ')} — using defaults`,
            );
          }
          return {
            eyebrow: s.eyebrow || '',
            title: s.title || s.headline || '',
            description: s.description || s.subheadline || '',
            ctaLabel: s.ctaLabel || 'Browse Projects',
            ctaUrl: s.ctaUrl || '/c/development',
            image: resolvedImage || '/sending-emails.png',
            accent: s.accent,
          };
        }),
      };
    } else if (doc.hero?.headline) {
      // Legacy single-slide hero — wrap in a slides array
      const image =
        (typeof doc.hero.backgroundImage === 'object'
          ? doc.hero.backgroundImage?.url
          : doc.hero.backgroundImage) || '/sending-emails.png';
      hero = {
        intervalMs: 7000,
        slides: [
          {
            eyebrow: doc.hero.eyebrow || 'Featured',
            title: doc.hero.headline,
            description: doc.hero.subheadline || '',
            ctaLabel: doc.hero.ctaLabel || 'Browse Projects',
            ctaUrl: doc.hero.ctaUrl || '/c/development',
            image,
          },
        ],
      };
    }

    const sections: SectionConfig[] | undefined = doc.sections?.length
      ? doc.sections.map((s: any) => ({
          key: s.key,
          title: s.title,
          subtitle: s.subtitle || '',
          ctaLabel: s.ctaLabel,
          ctaUrl: s.ctaUrl,
          tabs: Array.isArray(s.tabs) && s.tabs.length > 0
            ? s.tabs.map((t: any) => ({
                label: t.label,
                slug: t.slug,
                categoryFilter: t.categoryFilter || undefined,
                kind: t.kind || undefined,
              }))
            : undefined,
          blocks: (s.blocks || []).map((b: any) => ({
            entity: b.entity,
            type: b.displayType || 'carousel',
            kind: b.kind || 'newest',
            limit: b.limit || 8,
            sort: b.sort || 'newest',
            categoryFilter: b.categoryFilter,
            featuredOnly: b.featuredOnly === true,
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

    // Extract pinned items from sections (key → pinnedItemIds)
    const pinnedItems: Record<string, string[]> = {};
    if (doc.sections?.length) {
      for (const s of doc.sections) {
        if (s.manualEnabled && Array.isArray(s.pinnedItems) && s.pinnedItems.length > 0) {
          pinnedItems[s.key] = s.pinnedItems.map((p: any) =>
            typeof p === 'object' ? (p.sourceId || String(p.id)) : String(p),
          );
        }
      }
    }

    return { hero, sections, popularTabs, moreCategoriesList, talentNetworkCta, footerNav, seo, pinnedItems };
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
    allTeams: TeamCard[],
    allTalent: TalentCard[],
    usedIds: Set<string>,
    pinnedItemIds?: string[],
  ): HomepageSection {
    const blocks: HomepageBlock[] = [];

    // ── Tabbed sections: emit one block per (tab × blockCfg) combination ──
    // Tabs reuse the section's first blockCfg as a template; the tab's
    // categoryFilter / kind override the template values. Pinned items only
    // apply to the default flow (untabbed) to avoid duplication.
    if (cfg.tabs?.length) {
      for (const tab of cfg.tabs) {
        for (const blockCfg of cfg.blocks) {
          const effectiveCfg = {
            ...blockCfg,
            categoryFilter: tab.categoryFilter ?? blockCfg.categoryFilter,
            kind: tab.kind ?? blockCfg.kind,
          };
          const block = this.buildBlock(
            cfg.key,
            effectiveCfg,
            allProjects,
            allServices,
            allTeams,
            allTalent,
            // Tabs do not consume usedIds globally — same item can appear under
            // multiple tabs. Use a fresh set per tab.
            new Set<string>(),
            undefined,
          );
          block.key = `${cfg.key}-${tab.slug}-${blockCfg.entity}`;
          block.tabSlug = tab.slug;
          block.tabLabel = tab.label;
          blocks.push(block);
        }
      }
    } else {
      for (const blockCfg of cfg.blocks) {
        const block = this.buildBlock(
          cfg.key,
          blockCfg,
          allProjects,
          allServices,
          allTeams,
          allTalent,
          usedIds,
          pinnedItemIds,
        );
        blocks.push(block);
      }
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

  private buildBlock(
    sectionKey: string,
    blockCfg: SectionConfig['blocks'][number],
    allProjects: ProjectCard[],
    allServices: ServiceCard[],
    allTeams: TeamCard[],
    allTalent: TalentCard[],
    usedIds: Set<string>,
    pinnedItemIds: string[] | undefined,
  ): HomepageBlock {
    let pool: (ProjectCard | ServiceCard | TeamCard | TalentCard)[];

    if (blockCfg.entity === 'projects') {
      pool = allProjects.filter((p) => !usedIds.has(p.id));
    } else if (blockCfg.entity === 'teams') {
      pool = allTeams.filter((t) => !usedIds.has(t.id));
    } else if (blockCfg.entity === 'talent') {
      pool = allTalent.filter((t) => !usedIds.has(t.id));
    } else {
      pool = allServices.filter((s) => !usedIds.has(s.id));
    }

    // Apply category filter if configured
    if (blockCfg.categoryFilter) {
      const cat = blockCfg.categoryFilter.toLowerCase();
      pool = pool.filter((item) =>
        'categories' in item && item.categories?.some((c: string) => c.toLowerCase() === cat),
      );
    }

    // Editorial curation: when featuredOnly is set, restrict the pool to
    // items with `featured === true` (admin-curated). Used by spec §4.4.
    if (blockCfg.featuredOnly) {
      const beforeCount = pool.length;
      pool = pool.filter((item) => 'featured' in item && (item as ScoringFields).featured === true);
      if (pool.length === 0 && beforeCount > 0) {
        // Section will end up empty and get suppressed by assembleHomepage.
        // Warn so operators can flag more items as featured in the CMS/DB.
        this.logger.warn(
          `section "${sectionKey}" block ${blockCfg.entity} featuredOnly=true — ` +
            `0 of ${beforeCount} items matched. Section will be hidden. ` +
            `Flag more ${blockCfg.entity} as featured to populate it.`,
        );
      }
    }

    // ── Pinned items (hybrid mode) ──
    // If section has pinned items, place them first and fill remaining
    // slots with evaluated results. Pinned items excluded from evaluator pool.
    type CardItem = ProjectCard | ServiceCard | TeamCard | TalentCard;
    let pinnedItems: CardItem[] = [];
    if (pinnedItemIds?.length) {
      const pinSet = new Set(pinnedItemIds);
      pinnedItems = pool.filter((item) => pinSet.has(item.id));
      pool = pool.filter((item) => !pinSet.has(item.id));
      pinnedItems.forEach((i) => usedIds.add(i.id));
    }

    const adjustedLimit = Math.max(0, blockCfg.limit - pinnedItems.length);

    // ── Evaluate / rank by kind ──
    let evaluated: CardItem[];
    if (blockCfg.sort === 'random') {
      evaluated = [...pool].sort(() => Math.random() - 0.5).slice(0, adjustedLimit);
    } else {
      evaluated = evaluateItems(pool as any[], blockCfg.kind, adjustedLimit) as CardItem[];
    }

    // Merge: pinned first, then evaluated
    const items = [...pinnedItems, ...evaluated];
    items.forEach((i) => usedIds.add(i.id));

    // Carousel guard: downgrade to grid if insufficient items
    const effectiveType =
      blockCfg.type === 'carousel' && items.length < GRID_SIZE * CAROUSEL_MIN_PAGES
        ? 'grid'
        : blockCfg.type;

    const totalAvailable = pinnedItems.length + pool.length;
    const pageSize = blockCfg.limit;

    return {
      key: `${sectionKey}-${blockCfg.entity}`,
      type: effectiveType,
      entity: blockCfg.entity,
      items,
      pagination: {
        page: 1,
        pageSize,
        totalPages: Math.ceil(totalAvailable / pageSize),
        hasMore: totalAvailable > pageSize,
      },
    };
  }

  private async fetchAndMap<T>(url: string, mapper: (raw: any) => T): Promise<T[]> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(url, { timeout: 5000 }),
      );
      return (Array.isArray(data) ? data : []).map(mapper);
    } catch (err: any) {
      this.logger.warn(`Failed to fetch ${url}: ${err.message}`);
      return [];
    }
  }

  private fetchProjects(): Promise<ProjectCard[]> {
    return this.fetchAndMap(`${this.listingsUrl}/v1/projects`, (p) => this.toProjectCard(p));
  }

  private fetchServices(): Promise<ServiceCard[]> {
    return this.fetchAndMap(`${this.listingsUrl}/v1/services`, (s) => this.toServiceCard(s));
  }

  private fetchTeams(): Promise<TeamCard[]> {
    return this.fetchAndMap(`${this.listingsUrl}/v1/teams`, (t) => this.toTeamCard(t));
  }

  private fetchTalent(): Promise<TalentCard[]> {
    return this.fetchAndMap(`${this.userServiceUrl}/talent/users`, (t) => this.toTalentCard(t));
  }

  private truncate(text: string, max = CARD_DESCRIPTION_MAX_LENGTH): string {
    if (text.length <= max) return text;
    return text.slice(0, max - 1).trimEnd() + '\u2026';
  }

  private extractScoring(raw: any): ScoringFields {
    return {
      rating: raw.rating != null ? Number(raw.rating) : undefined,
      reviewCount: raw.reviewCount ?? undefined,
      completionsCount: raw.completionsCount ?? undefined,
      views90d: raw.views90d ?? undefined,
      adminBoost: raw.adminBoost != null ? Number(raw.adminBoost) : undefined,
      featured: raw.featured ?? undefined,
    };
  }

  private toProjectCard(raw: any): ProjectCard {
    const desc = raw.shortDescription || raw.description || '';
    return {
      id: raw.id,
      title: raw.title ?? '',
      slug: raw.slug ?? null,
      description: this.truncate(desc),
      shortDescription: raw.shortDescription ? this.truncate(raw.shortDescription) : null,
      thumbnail: raw.mediaUrls?.[0] ?? null,
      budget: raw.budget != null ? Number(raw.budget) : null,
      duration: raw.duration ?? null,
      categories: raw.categories ?? [],
      skills: raw.skills ?? [],
      tags: raw.tags ?? [],
      createdAt: raw.createdAt,
      ...this.extractScoring(raw),
    };
  }

  private toServiceCard(raw: any): ServiceCard {
    const desc = raw.shortDescription || raw.description || '';
    return {
      id: raw.id,
      title: raw.title ?? '',
      slug: raw.slug ?? null,
      description: this.truncate(desc),
      shortDescription: raw.shortDescription ? this.truncate(raw.shortDescription) : null,
      thumbnail: raw.mediaUrls?.[0] ?? null,
      priceMin: raw.priceMin != null ? Number(raw.priceMin) : null,
      priceMax: raw.priceMax != null ? Number(raw.priceMax) : null,
      deliveryTime: raw.deliveryTime ?? null,
      categories: raw.categories ?? [],
      skills: raw.skills ?? [],
      tags: raw.tags ?? [],
      createdAt: raw.createdAt,
      ...this.extractScoring(raw),
    };
  }

  private toTeamCard(raw: any): TeamCard {
    return {
      ...this.extractScoring(raw),
      id: raw.id,
      name: raw.title ?? '',
      slug: raw.slug ?? null,
      logo: raw.logo ?? raw.mediaUrls?.[0] ?? null,
      memberCount: raw.teamSize ?? raw.memberIds?.length ?? 0,
      rating: raw.rating != null ? Number(raw.rating) : 0,
      specializations: raw.specializations ?? raw.skills ?? [],
      completedProjects: raw.completedProjects ?? raw.completionsCount ?? 0,
      createdAt: raw.createdAt,
    };
  }

  private toTalentCard(raw: any): TalentCard {
    return {
      id: raw.id,
      username: raw.username ?? '',
      firstName: raw.firstName ?? null,
      lastName: raw.lastName ?? null,
      avatarUrl: raw.avatarUrl ?? null,
      title: raw.recentJobTitle ?? raw.jobTitles?.[0] ?? null,
      location: raw.location ?? null,
      rateMin: raw.rateMin != null ? Number(raw.rateMin) : null,
      rateMax: raw.rateMax != null ? Number(raw.rateMax) : null,
      skills: (raw.skills ?? []).map((s: any) => (typeof s === 'string' ? s : s.name)),
      createdAt: raw.createdAt ?? raw.onboardedAt ?? new Date().toISOString(),
    };
  }
}

/** Internal type for CMS homepage result — meta + partial config */
interface CmsHomepageResult {
  meta: { title: string; slug: string; status: 'active' | 'testing' | 'draft' };
  config: CmsHomepageConfig;
}

interface CmsHomepageConfig {
  hero?: HomepageHero;
  sections?: SectionConfig[];
  popularTabs?: CategoryRef[];
  moreCategoriesList?: CategoryRef[];
  talentNetworkCta?: TalentNetworkCta;
  footerNav?: FooterNavColumn[];
  seo?: HomepageSeo;
  /** Map of section key → array of pinned item IDs */
  pinnedItems?: Record<string, string[]>;
}

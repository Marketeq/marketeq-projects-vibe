import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  HomepagePayload,
  HomepageSection,
  HomepageBlock,
  HomepageBanner,
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

@Injectable()
export class HomepageService {
  private readonly logger = new Logger(HomepageService.name);
  private readonly listingsUrl: string;
  private readonly cmsUrl: string | null;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.listingsUrl =
      config.get<string>('LISTINGS_SERVICE_URL') || 'http://localhost:3004';
    this.cmsUrl = config.get<string>('CMS_SERVICE_URL') || null;
  }

  /**
   * Assemble the full homepage payload.
   *
   * Fetches listings from listings-service and banner from CMS service.
   * Section configuration comes from static config (homepage.config.ts)
   * until CMS homepage collection is implemented — at which point,
   * replace the HOMEPAGE_* imports with CMS-fetched config here.
   */
  async getHomepage(): Promise<HomepagePayload> {
    const [allProjects, allServices, banner] = await Promise.all([
      this.fetchProjects(),
      this.fetchServices(),
      this.fetchBanner(),
    ]);

    // Deduplicate: track used IDs across sections
    const usedProjectIds = new Set<string>();
    const usedServiceIds = new Set<string>();

    const sections: HomepageSection[] = [];

    for (const sectionCfg of HOMEPAGE_SECTIONS) {
      const section = this.assembleSection(
        sectionCfg,
        allProjects,
        allServices,
        usedProjectIds,
        usedServiceIds,
      );
      if (section.blocks.some((b) => b.items.length > 0)) {
        sections.push(section);
      }
    }

    return {
      hero: HOMEPAGE_HERO,
      banner,
      sections,
      popularTabs: HOMEPAGE_POPULAR_TABS,
      moreCategoriesList: HOMEPAGE_MORE_CATEGORIES,
      talentNetworkCta: HOMEPAGE_TALENT_CTA,
      footerNav: HOMEPAGE_FOOTER_NAV,
      seo: HOMEPAGE_SEO,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

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

  /**
   * Fetch the promotional banner from the CMS HomepageBanner global.
   * Returns null if CMS is unavailable, banner is disabled, or expired.
   */
  private async fetchBanner(): Promise<HomepageBanner | null> {
    if (!this.cmsUrl) return null;

    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.cmsUrl}/api/globals/homepage-banner`, {
          timeout: 3000,
        }),
      );

      if (!data?.enabled) return null;

      // Check expiration
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        return null;
      }

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

  private async fetchProjects(): Promise<ProjectCard[]> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.listingsUrl}/v1/projects`, { timeout: 5000 }),
      );
      const list = Array.isArray(data) ? data : [];
      return list.map((p: any) => this.toProjectCard(p));
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
      const list = Array.isArray(data) ? data : [];
      return list.map((s: any) => this.toServiceCard(s));
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

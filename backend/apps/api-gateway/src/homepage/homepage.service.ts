import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  HomepagePayload,
  HomepageSection,
  HomepageBlock,
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
} from './homepage.config';

@Injectable()
export class HomepageService {
  private readonly logger = new Logger(HomepageService.name);
  private readonly listingsUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.listingsUrl =
      config.get<string>('LISTINGS_SERVICE_URL') || 'http://localhost:3004';
  }

  /**
   * Assemble the full homepage payload.
   *
   * Currently fetches directly from listings-service via HTTP.
   * CMS placeholder: section configuration is static (homepage.config.ts).
   * When Payload CMS is integrated, replace HOMEPAGE_SECTIONS/HERO/etc. with
   * CMS-fetched config and keep the assembly logic below.
   */
  async getHomepage(): Promise<HomepagePayload> {
    // Fetch all projects and services in parallel from listings-service
    const [allProjects, allServices] = await Promise.all([
      this.fetchProjects(),
      this.fetchServices(),
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
      // Suppress empty sections
      if (section.blocks.some((b) => b.items.length > 0)) {
        sections.push(section);
      }
    }

    return {
      hero: HOMEPAGE_HERO,
      sections,
      popularTabs: HOMEPAGE_POPULAR_TABS,
      moreCategoriesList: HOMEPAGE_MORE_CATEGORIES,
      talentNetworkCta: HOMEPAGE_TALENT_CTA,
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

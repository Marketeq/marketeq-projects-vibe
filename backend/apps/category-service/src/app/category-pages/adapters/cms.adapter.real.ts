import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CmsAdapter } from './cms.adapter';
import { TaxonomyGroup } from '../types/taxonomy.types';
import { EditorialContent } from '../types/editorial.types';

/**
 * REAL implementation of CmsAdapter — targets Payload CMS REST API.
 */
@Injectable()
export class CmsAdapterReal extends CmsAdapter {
  private readonly logger = new Logger(CmsAdapterReal.name);
  private readonly cmsUrl: string;
  private readonly cmsApiKey: string;

  constructor(private readonly httpService: HttpService) {
    super();
    this.cmsUrl = (
      process.env.CMS_SERVICE_URL || 'http://localhost:3020'
    ).replace(/\/+$/, '');
    this.cmsApiKey = process.env.CMS_API_KEY || '';

    if (!this.cmsApiKey) {
      this.logger.warn('CMS_API_KEY not configured — Taxonomy Groups will not work!');
    }

    this.logger.log(`CmsAdapterReal initialized: ${this.cmsUrl}`);
  }

  private authHeaders() {
    return this.cmsApiKey
      ? { Authorization: `API-Key ${this.cmsApiKey}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  }

  async getTaxonomyGroups(categoryUuid: string): Promise<TaxonomyGroup[]> {
    try {
      const url = `${this.cmsUrl}/api/taxonomy-groups?depth=2&limit=1000`;

      this.logger.log(`Fetching Taxonomy Groups for category: ${categoryUuid}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.authHeaders(),
          timeout: 5000,
        }),
      );

      const docs = response.data?.docs ?? response.data?.data ?? [];
      this.logger.log(`Found ${docs.length} total Taxonomy Groups in CMS`);

      const matchingGroups = docs.filter((group: any) => {
        const categories = group.categories ?? [];
        return categories.some((cat: any) => {
          const uuid = typeof cat === 'object' ? (cat.uuid || cat.id) : cat;
          return String(uuid) === categoryUuid;
        });
      });

      this.logger.log(
        `Found ${matchingGroups.length} Taxonomy Group(s) for category ${categoryUuid}`,
      );

      const transformed = matchingGroups.map((group: any) =>
        this.transformTaxonomyGroup(group),
      );

      transformed.forEach((group: TaxonomyGroup) => {
        this.logger.debug(`Group "${group.name}": ${group.rules.length} rule(s)`);
      });

      return transformed;
    } catch (error: any) {
      this.logger.error(`Failed to fetch Taxonomy Groups: ${error.message}`);

      if (error.response?.status === 401) {
        this.logger.error('Authentication failed — check CMS_API_KEY in .env');
      } else if (error.response?.status === 404) {
        this.logger.error('Taxonomy Groups endpoint not found — check Payload collection exists');
      } else if (error.code === 'ECONNREFUSED') {
        this.logger.error(`Cannot connect to CMS at ${this.cmsUrl} — is it running?`);
      }

      return [];
    }
  }

  async getEditorial(categoryUuid: string): Promise<EditorialContent | null> {
    try {
      // CategoryPages.categoryRef.categoryId was intended to store the
      // category-service UUID, but some seeds store the category slug instead.
      // We resolve the CMS category slug by UUID, then try both lookups.
      let categorySlug: string | undefined;
      try {
        const catUrl =
          `${this.cmsUrl}/api/categories` +
          `?where[uuid][equals]=${encodeURIComponent(categoryUuid)}` +
          `&limit=1&depth=0`;
        const catRes = await firstValueFrom(
          this.httpService.get(catUrl, {
            headers: this.authHeaders(),
            timeout: 5000,
          }),
        );
        const catDoc = (catRes.data?.docs ?? catRes.data?.data ?? [])?.[0];
        if (catDoc?.slug) categorySlug = String(catDoc.slug);
      } catch {
        // non-fatal; we can still try UUID-based lookup
      }

      const fetchByCategoryId = async (categoryId: string) => {
        const url =
          `${this.cmsUrl}/api/category-pages` +
          `?where[categoryRef.categoryId][equals]=${encodeURIComponent(categoryId)}` +
          `&limit=1&depth=2`;
        const response = await firstValueFrom(
          this.httpService.get(url, {
            headers: this.authHeaders(),
            timeout: 5000,
          }),
        );
        return response.data?.docs ?? response.data?.data ?? [];
      };

      const docsByUuid = await fetchByCategoryId(categoryUuid);
      const docsBySlug = categorySlug ? await fetchByCategoryId(categorySlug) : [];
      const doc = (docsByUuid?.[0] ?? docsBySlug?.[0]) as any;
      if (!doc) return null;

      const hero = (() => {
        const banner = doc.heroBanner ?? doc.hero ?? null;
        if (!banner) return undefined;

        const title =
          banner.titleOverride ||
          doc.categoryRef?.name ||
          doc.displayTitle ||
          undefined;
        const subtitle = banner.descriptionOverride || undefined;

        const rawImage =
          banner.image?.url ||
          banner.image?.sizes?.card?.url ||
          banner.image?.sizes?.thumbnail?.url ||
          banner.image?.filename ||
          undefined;

        const image =
          typeof rawImage === 'string'
            ? rawImage.startsWith('http')
              ? rawImage
              : `${this.cmsUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`
            : undefined;

        if (!title && !subtitle && !image) return undefined;

        return {
          title: title ?? doc.categoryRef?.name ?? doc.displayTitle ?? 'Category',
          subtitle,
          image: image ?? '',
          link: banner.ctaHref || undefined,
        };
      })();

      const faq =
        Array.isArray(doc.faq)
          ? doc.faq
              .filter((f: any) => f?.question && f?.answer)
              .map((f: any) => ({ question: String(f.question), answer: String(f.answer) }))
          : undefined;

      return {
        hero,
        faq,
      };
    } catch (error: any) {
      this.logger.warn(
        `Failed to fetch editorial content for category ${categoryUuid}: ${error?.message ?? error}`,
      );
      return null;
    }
  }

  private transformTaxonomyGroup(doc: any): TaxonomyGroup {
    const categories = doc.categories ?? [];
    const categoryUuids = categories
      .map((cat: any) => (typeof cat === 'object' ? (cat.uuid || String(cat.id)) : String(cat)))
      .filter(Boolean);

    return {
      id: doc.id,
      name: doc.name,
      path_scope: doc.path_scope,
      categoryUuids,
      rules: doc.rules || [],
    };
  }

  async getAllTaxonomyGroups(): Promise<TaxonomyGroup[]> {
    try {
      const url = `${this.cmsUrl}/api/taxonomy-groups?depth=2&limit=1000`;
      this.logger.log(`Fetching ALL Taxonomy Groups`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.authHeaders(),
          timeout: 5000,
        }),
      );

      const docs = response.data?.docs ?? response.data?.data ?? [];
      this.logger.log(`Found ${docs.length} total Taxonomy Groups`);
      return docs.map((doc: any) => this.transformTaxonomyGroup(doc));
    } catch (error: any) {
      this.logger.error(`Failed to fetch all Taxonomy Groups: ${error.message}`);
      return [];
    }
  }
}

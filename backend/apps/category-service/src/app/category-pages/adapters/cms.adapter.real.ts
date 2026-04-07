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
    // Not yet implemented — editorial content collection not yet added to CMS.
    // Returns null so category pages render without editorial sections.
    this.logger.debug(`Editorial content not available for category: ${categoryUuid}`);
    return null;
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

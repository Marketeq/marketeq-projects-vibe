import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { StrapiAdapter } from './strapi.adapter';
import { TaxonomyGroup } from '../types/taxonomy.types';
import { EditorialContent } from '../types/editorial.types';

/**
 * REAL implementation of StrapiAdapter — now targets Payload CMS REST API
 * instead of Strapi. The adapter interface is unchanged so consumers
 * (CategoryPagesService) don't need to change.
 */
@Injectable()
export class StrapiAdapterReal extends StrapiAdapter {
  private readonly logger = new Logger(StrapiAdapterReal.name);
  private readonly cmsUrl: string;
  private readonly cmsApiKey: string;

  constructor(private readonly httpService: HttpService) {
    super();
    this.cmsUrl = (
      process.env.CMS_SERVICE_URL ||
      process.env.STRAPI_URL ||
      'http://localhost:3020'
    ).replace(/\/+$/, '');
    this.cmsApiKey = process.env.CMS_API_KEY || process.env.STRAPI_TOKEN || '';

    if (!this.cmsApiKey) {
      this.logger.warn('CMS_API_KEY not configured — Taxonomy Groups will not work!');
    }

    this.logger.log(`StrapiAdapterReal initialized (Payload CMS): ${this.cmsUrl}`);
  }

  private authHeaders() {
    return this.cmsApiKey
      ? { Authorization: `API-Key ${this.cmsApiKey}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  }

  /**
   * Fetch Taxonomy Groups for a specific category UUID from Payload CMS.
   * In Payload, taxonomy-groups is a collection with a categories relationship.
   */
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

      // Payload response: { docs: [...], totalDocs, ... }
      const docs = response.data?.docs ?? response.data?.data ?? [];

      this.logger.log(`Found ${docs.length} total Taxonomy Groups in CMS`);

      // Filter groups linked to this category
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

  /**
   * Fetch Editorial content for a category from Payload CMS
   */
  async getEditorial(categoryUuid: string): Promise<EditorialContent | null> {
    try {
      this.logger.log(`Fetching Editorial content for category: ${categoryUuid}`);
      // Editorial content not yet implemented in Payload CMS
      return null;
    } catch (error: any) {
      this.logger.error(`Failed to fetch Editorial content: ${error.message}`);
      return null;
    }
  }

  /**
   * Transform Payload CMS doc to TaxonomyGroup format
   */
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

  /**
   * Get all Taxonomy Groups (for testing/admin purposes)
   */
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

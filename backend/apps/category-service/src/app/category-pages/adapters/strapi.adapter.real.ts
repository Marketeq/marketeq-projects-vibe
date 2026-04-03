import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { StrapiAdapter } from './strapi.adapter';
import { TaxonomyGroup } from '../types/taxonomy.types';
import { EditorialContent } from '../types/editorial.types';

/**
 * REAL implementation of StrapiAdapter
 * Fetches Taxonomy Groups and Editorial content from Strapi HTTP API
 */
@Injectable()
export class StrapiAdapterReal extends StrapiAdapter {
  private readonly logger = new Logger(StrapiAdapterReal.name);
  private readonly strapiUrl: string;
  private readonly strapiToken: string;

  constructor(private readonly httpService: HttpService) {
    super();
    this.strapiUrl = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/+$/, '');
    this.strapiToken = process.env.STRAPI_TOKEN || '';
    
    if (!this.strapiToken) {
      this.logger.warn('STRAPI_TOKEN not configured - Taxonomy Groups will not work!');
    }
    
    this.logger.log(`StrapiAdapterReal initialized: ${this.strapiUrl}`);
  }

  /**
   * Fetch Taxonomy Groups for a specific category UUID from Strapi
   */
  async getTaxonomyGroups(categoryUuid: string): Promise<TaxonomyGroup[]> {
    try {
      const url = `${this.strapiUrl}/api/taxonomy-groups?populate=*`;
      
      this.logger.log(`Fetching Taxonomy Groups for category: ${categoryUuid}`);
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${this.strapiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000, // 5 second timeout
        })
      );

      const groups = response.data.data || [];
      
      this.logger.log(`Found ${groups.length} total Taxonomy Groups in Strapi`);
      
      // Filter groups that are linked to this category
      const matchingGroups = groups.filter((group: any) => {
        const attrs = group.attributes || group;
        const categories = attrs.categories?.data || attrs.categories || [];
        
        // Check if this category UUID is in the group's categories
        const isMatch = categories.some((cat: any) => {
          const catAttrs = cat.attributes || cat;
          const matches = catAttrs.uuid === categoryUuid;
          
          if (matches) {
            this.logger.log(` Group "${attrs.name}" matches category ${categoryUuid}`);
          }
          
          return matches;
        });
        
        return isMatch;
      });

      this.logger.log(`Found ${matchingGroups.length} Taxonomy Group(s) for category ${categoryUuid}`);

      // Transform to our format
      const transformed = matchingGroups.map((group: any) => this.transformTaxonomyGroup(group));
      
      // Log rules for debugging
      transformed.forEach((group: TaxonomyGroup) => {
        this.logger.debug(`Group "${group.name}": ${group.rules.length} rule(s)`);
        group.rules.forEach((rule: any, idx: number) => {
          this.logger.debug(`   Rule ${idx + 1}: ${rule.entity} (${rule.kind}) - limit: ${rule.limit}`);
        });
      });
      
      return transformed;
      
    } catch (error: any) {
      this.logger.error(`Failed to fetch Taxonomy Groups: ${error.message}`);
      
      if (error.response?.status === 401) {
        this.logger.error('Authentication failed - check STRAPI_TOKEN in .env');
      } else if (error.response?.status === 404) {
        this.logger.error('Taxonomy Groups endpoint not found - check Strapi content type exists');
      } else if (error.code === 'ECONNREFUSED') {
        this.logger.error(`Cannot connect to Strapi at ${this.strapiUrl} - is it running?`);
      }
      
      // Graceful degradation - return empty array instead of throwing
      return [];
    }
  }

  /**
   * Fetch Editorial content for a category from Strapi
   */
  async getEditorial(categoryUuid: string): Promise<EditorialContent | null> {
    try {
      this.logger.log(`Fetching Editorial content for category: ${categoryUuid}`);
      
      // TODO: Implement when editorial content type is ready in Strapi
      // For now, return null (no editorial content)
      this.logger.log(`Editorial content not yet implemented - returning null`);
      
      return null;
      
    } catch (error: any) {
      this.logger.error(`Failed to fetch Editorial content: ${error.message}`);
      return null;
    }
  }

  /**
   * Transform Strapi response to our TaxonomyGroup format
   */
  private transformTaxonomyGroup(rawGroup: any): TaxonomyGroup {
    const attrs = rawGroup.attributes || rawGroup;
    
    // Extract category UUIDs
    const categories = attrs.categories?.data || attrs.categories || [];
    const categoryUuids = categories.map((cat: any) => {
      const catAttrs = cat.attributes || cat;
      return catAttrs.uuid;
    }).filter(Boolean);
    
    return {
      id: rawGroup.id,
      name: attrs.name,
      path_scope: attrs.path_scope,
      categoryUuids,
      rules: attrs.rules || [],
    };
  }

  /**
   * Get all Taxonomy Groups (for testing/admin purposes)
   */
  async getAllTaxonomyGroups(): Promise<TaxonomyGroup[]> {
    try {
      const url = `${this.strapiUrl}/api/taxonomy-groups?populate=*`;
      
      this.logger.log(`Fetching ALL Taxonomy Groups`);
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${this.strapiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        })
      );

      const groups = response.data.data || [];
      
      this.logger.log(`Found ${groups.length} total Taxonomy Groups`);
      
      return groups.map((group: any) => this.transformTaxonomyGroup(group));
      
    } catch (error: any) {
      this.logger.error(`Failed to fetch all Taxonomy Groups: ${error.message}`);
      return [];
    }
  }
}
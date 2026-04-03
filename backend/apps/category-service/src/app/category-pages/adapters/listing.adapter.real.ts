import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ListingAdapter } from './listing.adapter';
import { PaginatedResponse, PaginatedQueryParams } from '../types/taxonomy.types';
import { encodeCursor, decodeCursor } from '../utils/cursor.utils';

/**
 * REAL implementation of ListingAdapter
 * Fetches projects, services, and teams from Strapi HTTP API
 * 
 * FIXED: Now includes image population
 */
@Injectable()
export class ListingAdapterReal extends ListingAdapter {
  private readonly logger = new Logger(ListingAdapterReal.name);
  private readonly strapiUrl: string;
  private readonly strapiToken: string;

  constructor(private readonly httpService: HttpService) {
    super();
    this.strapiUrl = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/+$/, '');
    this.strapiToken = process.env.STRAPI_TOKEN || '';

    if (!this.strapiToken) {
      this.logger.warn('STRAPI_TOKEN not configured - API requests may fail!');
    }

    this.logger.log(`ListingAdapterReal initialized: ${this.strapiUrl}`);
  }

  /**
   * Query projects from Strapi with pagination
   * FIXED: Now populates images
   */
  async queryProjects(params: PaginatedQueryParams): Promise<PaginatedResponse<any>> {
    try {
      this.logger.log(
        `Fetching projects: order=${params.order}, limit=${params.limit}, cursor=${params.cursor || 'none'}`
      );

      const sortField = this.getSortField(params.order);
      const sortOrder = 'desc';

      // Simple pagination - just use page numbers
      const page = params.cursor ? parseInt(params.cursor) : 1;

      // ✅ FIXED: Changed from 'populate': 'category' to 'populate': '*'
      const queryParams = new URLSearchParams({
        'sort[0]': `${sortField}:${sortOrder}`,
        'pagination[page]': page.toString(),
        'pagination[pageSize]': params.limit.toString(),
        'populate': '*', // ✅ This includes all relations (category, images, media)
      });

      // Skip filters for now
      // if (params.categoryUuid) {
      //   queryParams.append('filters[category][uuid][$eq]', params.categoryUuid);
      // }

      const url = `${this.strapiUrl}/api/projects?${queryParams.toString()}`;

      this.logger.log(`Strapi URL: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${this.strapiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        })
      );

      const rawItems = response.data.data || [];

      this.logger.log(`Fetched ${rawItems.length} projects from Strapi`);

      // ✅ DEBUG: Log first project to see image structure
      if (rawItems.length > 0) {
        this.logger.log(`Sample project data: ${JSON.stringify(rawItems[0], null, 2)}`);
      }

      // Transform Strapi format to our format
      const items = rawItems.map((item: any) => this.transformProject(item));

      // ✅ DEBUG: Log transformed item to verify images
      if (items.length > 0) {
        this.logger.log(`Transformed project: ${JSON.stringify(items[0], null, 2)}`);
      }

      // Simple pagination
      const hasMore = items.length === params.limit;
      const nextCursor = hasMore ? (page + 1).toString() : undefined;

      this.logger.log(
        `Returning ${items.length} projects, hasMore: ${hasMore}, nextCursor: ${nextCursor}`
      );

      return {
        items: items,
        nextCursor,
        hasMore,
      };

    } catch (error: any) {
      this.logger.error(`Failed to fetch projects: ${error.message}`);

      if (error.response?.status === 400) {
        this.logger.error(`Bad request - query parameters might be invalid`);
        this.logger.error(`Response: ${JSON.stringify(error.response?.data)}`);
      }

      return {
        items: [],
        nextCursor: undefined,
        hasMore: false,
      };
    }
  }

  /**
   * Query services from Strapi with pagination
   */
  async queryServices(params: PaginatedQueryParams): Promise<PaginatedResponse<any>> {
    try {
      this.logger.log(
        `Fetching services: order=${params.order}, limit=${params.limit}`
      );

      // TODO: Implement when services content type is ready in Strapi
      this.logger.warn('Services not yet implemented - returning empty array');

      return {
        items: [],
        nextCursor: undefined,
        hasMore: false,
      };

    } catch (error: any) {
      this.logger.error(`Failed to fetch services: ${error.message}`);
      return {
        items: [],
        nextCursor: undefined,
        hasMore: false,
      };
    }
  }

  /**
   * Query teams from Strapi with pagination
   */
  async queryTeams(params: PaginatedQueryParams): Promise<PaginatedResponse<any>> {
    try {
      this.logger.log(
        `Fetching teams: order=${params.order}, limit=${params.limit}`
      );

      // TODO: Implement when teams content type is ready in Strapi
      this.logger.warn('Teams not yet implemented - returning empty array');

      return {
        items: [],
        nextCursor: undefined,
        hasMore: false,
      };

    } catch (error: any) {
      this.logger.error(`Failed to fetch teams: ${error.message}`);
      return {
        items: [],
        nextCursor: undefined,
        hasMore: false,
      };
    }
  }

  /**
   * Transform Strapi project to our format
   * ✅ FIXED: Now properly handles image URLs
   */
  private transformProject(rawProject: any): any {
    const attrs = rawProject.attributes || rawProject;

    // ✅ FIXED: Build full image URL with multiple fallbacks
    let coverImage = undefined;
    let thumbnail = undefined;

    // Try cover_image first
    if (attrs.cover_image?.data?.attributes?.url) {
      const imageUrl = attrs.cover_image.data.attributes.url;
      coverImage = imageUrl.startsWith('http') ? imageUrl : `${this.strapiUrl}${imageUrl}`;
      thumbnail = coverImage;
    }
    // Fallback to featured_image
    else if (attrs.featured_image?.data?.attributes?.url) {
      const imageUrl = attrs.featured_image.data.attributes.url;
      coverImage = imageUrl.startsWith('http') ? imageUrl : `${this.strapiUrl}${imageUrl}`;
      thumbnail = coverImage;
    }
    // Fallback to first media item
    else if (attrs.media?.data?.[0]?.attributes?.url) {
      const imageUrl = attrs.media.data[0].attributes.url;
      coverImage = imageUrl.startsWith('http') ? imageUrl : `${this.strapiUrl}${imageUrl}`;
      thumbnail = coverImage;
    }
    // Fallback to image field (if exists)
    else if (attrs.image?.data?.attributes?.url) {
      const imageUrl = attrs.image.data.attributes.url;
      coverImage = imageUrl.startsWith('http') ? imageUrl : `${this.strapiUrl}${imageUrl}`;
      thumbnail = coverImage;
    }

    this.logger.log(`Project ${attrs.slug}: coverImage=${coverImage || 'NO IMAGE'}`);

    return {
      id: rawProject.id || `project-${attrs.slug}`,
      title: attrs.title,
      slug: attrs.slug,
      summary: attrs.summary,
      description: attrs.description,
      featured: attrs.featured || false,
      rating: attrs.rating || 4.5,
      reviewCount: attrs.review_count || attrs.reviewCount || 0,
      price: attrs.price || 0,
      coverImage,      // ✅ Now includes full URL
      thumbnail,       // ✅ Frontend fallback
      skills: attrs.required_skills || attrs.skills || [],
      role: attrs.role,
      projectStatus: attrs.project_status || attrs.projectStatus,
      scopeTotal: {
        timeline: attrs.timeline || attrs.scope_total?.timeline || '12 weeks',
        budget: attrs.budget || attrs.scope_total?.budget || attrs.price || 50000,
      },
      createdAt: attrs.createdAt,
      updatedAt: attrs.updatedAt,
    };
  }

  /**
   * Map order type to Strapi field name
   */
  private getSortField(order: string): string {
    switch (order) {
      case 'top_rated':
        return 'createdAt';
      case 'curated':
        return 'featured';
      case 'trending':
        return 'createdAt';
      case 'new':
        return 'createdAt';
      default:
        return 'createdAt';
    }
  }
}
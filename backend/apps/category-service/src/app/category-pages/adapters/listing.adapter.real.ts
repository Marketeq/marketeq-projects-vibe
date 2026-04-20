import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ListingAdapter } from './listing.adapter';
import { PaginatedResponse, PaginatedQueryParams } from '../types/taxonomy.types';

/**
 * REAL implementation of ListingAdapter
 * Fetches projects, services, and teams from CMS service (Payload CMS REST API).
 */
@Injectable()
export class ListingAdapterReal extends ListingAdapter {
  private readonly logger = new Logger(ListingAdapterReal.name);
  private readonly cmsUrl: string;
  private readonly apiKey: string;

  constructor(private readonly httpService: HttpService) {
    super();
    this.cmsUrl = (
      process.env.CMS_SERVICE_URL ||
      'http://localhost:3020'
    ).replace(/\/+$/, '');
    this.apiKey = process.env.CMS_API_KEY || '';

    if (!this.apiKey) {
      this.logger.warn('CMS_API_KEY not configured — API requests may fail!');
    }

    this.logger.log(`ListingAdapterReal initialized (Payload CMS): ${this.cmsUrl}`);
  }

  private authHeaders() {
    if (!this.apiKey) return { 'Content-Type': 'application/json' };
    return { Authorization: `API-Key ${this.apiKey}`, 'Content-Type': 'application/json' };
  }

  /**
   * Query listings from Payload CMS with pagination.
   * Payload REST: GET /api/listings?where[listingType][equals]=project&sort=-createdAt&limit=N&page=N&depth=1
   */
  async queryProjects(params: PaginatedQueryParams): Promise<PaginatedResponse<any>> {
    return this.queryListings('project', params);
  }

  async queryServices(params: PaginatedQueryParams): Promise<PaginatedResponse<any>> {
    return this.queryListings('service', params);
  }

  async queryTeams(params: PaginatedQueryParams): Promise<PaginatedResponse<any>> {
    return this.queryListings('team', params);
  }

  private async queryListings(
    listingType: string,
    params: PaginatedQueryParams,
  ): Promise<PaginatedResponse<any>> {
    try {
      this.logger.log(
        `Fetching ${listingType}s: order=${params.order}, limit=${params.limit}, cursor=${params.cursor || 'none'}`,
      );

      const sortField = this.getSortField(params.order);
      const page = params.cursor ? parseInt(params.cursor) : 1;

      // Payload CMS query params
      const queryParams = new URLSearchParams({
        [`where[listingType][equals]`]: listingType,
        [`where[status][equals]`]: 'published',
        sort: `-${sortField}`,
        limit: params.limit.toString(),
        page: page.toString(),
        depth: '1',
      });

      const url = `${this.cmsUrl}/api/listings?${queryParams.toString()}`;

      this.logger.log(`CMS URL: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.authHeaders(),
          timeout: 30000,
        }),
      );

      // Payload response: { docs: [...], totalDocs, hasNextPage, ... }
      const docs = response.data?.docs ?? response.data?.data ?? [];

      this.logger.log(`Fetched ${docs.length} ${listingType}s from CMS`);

      const items = docs.map((doc: any) => this.transformListing(doc));

      const hasMore = response.data?.hasNextPage ?? items.length === params.limit;
      const nextCursor = hasMore ? (page + 1).toString() : undefined;

      return {
        items,
        nextCursor,
        hasMore,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch ${listingType}s: ${error.message}`);
      return {
        items: [],
        nextCursor: undefined,
        hasMore: false,
      };
    }
  }

  /**
   * Transform Payload CMS listing doc to our format.
   * Payload returns flat objects — no nested .attributes wrapper.
   */
  private transformListing(doc: any): any {
    let coverImage: string | undefined;
    let thumbnail: string | undefined;

    // Payload populates upload fields as objects with url
    if (doc.coverImage?.url) {
      const imageUrl = doc.coverImage.url;
      coverImage = imageUrl.startsWith('http') ? imageUrl : `${this.cmsUrl}${imageUrl}`;
      thumbnail = coverImage;
    }

    return {
      id: doc.id || doc.sourceId || `listing-${doc.slug}`,
      title: doc.title,
      slug: doc.slug,
      summary: doc.excerpt,
      featured: doc.featured || false,
      editorialLabel: doc.editorialLabel,
      featuredOrder: doc.featuredOrder,
      rating: doc.rating || 0,
      reviewCount: doc.reviewCount || 0,
      price: doc.price || 0,
      coverImage,
      thumbnail,
      category: typeof doc.category === 'object' ? doc.category?.slug : doc.category,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private getSortField(order: string): string {
    switch (order) {
      case 'top_rated':
        return 'rating';
      case 'curated':
        return 'featuredOrder';
      case 'trending':
        return 'updatedAt';
      case 'new':
        return 'createdAt';
      default:
        return 'createdAt';
    }
  }
}

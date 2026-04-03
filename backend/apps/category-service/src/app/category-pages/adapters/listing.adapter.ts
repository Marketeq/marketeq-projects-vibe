import { PaginatedResponse, PaginatedQueryParams } from '../types/taxonomy.types';


export interface ListingQueryParams {
    categoryUuid: string;
    order: 'top_rated' | 'trending' | 'new';
    limit: number;
    cursor?: string;
  }
  
  export interface ListingQueryResponse {
    items: any[];
    nextCursor?: string;
  }
  
  /**
   * ListingAdapter Interface
   * 
   * Defines contract for fetching projects, services, and teams from Listing Service.
   * Real implementation will be provided by Jayesh.
   */
  export abstract class ListingAdapter {
    /**
     * Query projects with pagination support
     */
    abstract queryProjects(
      params: PaginatedQueryParams
    ): Promise<PaginatedResponse<any>>;
  
    /**
     * Query services with pagination support
     */
    abstract queryServices(
      params: PaginatedQueryParams
    ): Promise<PaginatedResponse<any>>;
  
    /**
     * Query teams with pagination support
     */
    abstract queryTeams(
      params: PaginatedQueryParams
    ): Promise<PaginatedResponse<any>>;
  }
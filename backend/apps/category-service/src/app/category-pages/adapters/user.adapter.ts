import { PaginatedResponse, PaginatedQueryParams } from '../types/taxonomy.types';

export interface TalentQueryParams {
    categoryUuid: string;
    order: 'top_rated' | 'trending' | 'new';
    limit: number;
    cursor?: string;
  }
  
  export interface TalentQueryResponse {
    items: any[];
    nextCursor?: string;
  }
  
  /**
   * UserAdapter Interface
   * 
   * Defines contract for fetching talent profiles from User Service.
   * Real implementation will be provided by Jayesh.
   */
  export abstract class UserAdapter {
        /**
     * Query talent profiles with pagination support
     */
    abstract queryTalent(
        params: PaginatedQueryParams
    ): Promise<PaginatedResponse<any>>;
    }
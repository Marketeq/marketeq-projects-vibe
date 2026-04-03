/**
 * Rule defines one content block on a category page
 * Rules are executed in order to build the blocks array
 */
export type Rule = {
  name: string;
  entity: 'projects' | 'services' | 'teams' | 'talent' | 'guides' | 'courses' | 'collections';
  kind: 'top_rated' | 'trending' | 'new' | 'curated';
  carousel?: boolean;
  type?: 'show-all' | 'projects' | 'services' | 'teams' | 'talent' | 'any';
  hidden?: boolean;         // NEW: Hide/show toggle
};

/**
 * TaxonomyGroup contains rules for one or more categories
 * Defines what content blocks should appear on category pages
 */
export type TaxonomyGroup = {
  id: number;
  name: string;
  path_scope?: 'l1' | 'l2' | 'l3' | 'subtree';
  categoryUuids: string[];
  rules: Rule[];
};

/**
 * Pagination metadata for a block
 */
export interface BlockPagination {
  nextCursor?: string;
  hasMore: boolean;
  currentPage?: number;
  maxPages?: number;
}

/**
 * Query parameters for paginated requests
 * UPDATED: Now properly handles rows vs items
 */
export interface PaginatedQueryParams {
  categoryUuid: string;
  cursor?: string;
  limit: number;              // Total items to fetch (rowsPerPage × cardsPerRow)
  rowsPerPage?: number;       // NEW: Max rows to show (default: 10)
  cardsPerRow?: number;       // NEW: Cards per row (default: 3-4)
  order: 'top_rated' | 'trending' | 'new' | 'curated';
}

/**
 * Response from adapter with pagination
 */
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Block specification with pagination
 * Represents one content section on a category page
 */
export interface BlockSpec {
  /** Unique identifier for this block */
  key: string;
  
  /** Display type (grid or carousel) */
  type: 'grid';
  
  /** Entity type (projects, services, etc.) */
  entity: 'projects' | 'services' | 'teams' | 'talent' | 'guides' | 'courses' | 'collections';
  
  /** Display title for the block */
  title: string;
  
  /** Optional description */
  description?: string;
  
  /** Items to display in this block */
  items: any[];
  
  /** Pagination metadata (present if more items available) */
  pagination?: BlockPagination;
  
  /** URL for "View More" button (goes to filtered page) */
  viewMoreUrl?: string;
  
  /** Grid size (cards per row) */
  gridSize?: number;
  
  /** Whether to display as carousel */
  carousel?: boolean;
}

/**
 * Cursor data structure
 * Stored as JSON and encoded to base64url
 */
export interface CursorData {
  /** Item ID for cursor positioning */
  id?: string;
  /** Creation timestamp for stable ordering */
  createdAt?: string;
}

/**
 * NEW: Helper to calculate actual items needed
 * Based on rows and grid size
 */
export function calculateItemLimit(
  rowsPerPage: number = 10,    // Max 10 scrolls (default)
  cardsPerRow: number = 3      // Default grid size
): number {
  return rowsPerPage * cardsPerRow;
}
import { Injectable, Logger } from '@nestjs/common';
import { Rule, PaginatedResponse, PaginatedQueryParams, calculateItemLimit } from '../types/taxonomy.types';
import { ListingAdapter } from '../adapters/listing.adapter';
import { UserAdapter } from '../adapters/user.adapter';

interface ExecuteRuleOptions {
  cursor?: string;
  limit?: number;           // Legacy: total items (unused if rowsPerPage set)
  rowsPerPage?: number;     // Rows per block (from query `limit`, clamped in controller)
  cardsPerRow?: number;     // Optional override (env CATEGORY_PAGE_CARDS_PER_ROW)
}

/**
 * EvaluatorFactory
 * 
 * Executes taxonomy rules by calling appropriate adapters.
 * Maps rules to adapter calls and returns items for each block with pagination.
 * 
 * UPDATED: Now properly handles rows vs items calculation
 */
@Injectable()
export class EvaluatorFactory {
  private readonly logger = new Logger(EvaluatorFactory.name);

  constructor(
    private readonly listingAdapter: ListingAdapter,
    private readonly userAdapter: UserAdapter,
  ) {}

  /**
   * Execute a rule and return paginated results
   * 
   * FIXED: Now calculates items based on ROWS not total items
   */
  async executeRule(
    rule: Rule,
    categoryUuid: string,
    options: ExecuteRuleOptions
  ): Promise<PaginatedResponse<any>> {
    
    // ========================================
    // CRITICAL FIX: Calculate actual limit from ROWS
    // ========================================
    
    const rowsPerPage = Math.min(
      Math.max(options.rowsPerPage ?? 10, 1),
      10,
    );
    const envCards = Number(process.env.CATEGORY_PAGE_CARDS_PER_ROW);
    const parsedCards =
      options.cardsPerRow ??
      (Number.isFinite(envCards) && envCards > 0 ? envCards : 4);
    const cardsPerRow = Math.min(Math.max(parsedCards, 1), 8);
    const actualLimit = calculateItemLimit(rowsPerPage, cardsPerRow);

    this.logger.log(
      `Executing rule: ${rule.entity} (${rule.kind}) | ` +
      `Rows: ${rowsPerPage} × Cards: ${cardsPerRow} = ${actualLimit} items`
    );

    const params: PaginatedQueryParams = {
      categoryUuid,
      order: this.mapKindToOrder(rule.kind),
      limit: actualLimit,
      rowsPerPage,
      cardsPerRow,
      cursor: options.cursor,
    };

    try {
      switch (rule.entity) {
        case 'projects': {
          return await this.listingAdapter.queryProjects(params);
        }

        case 'services': {
          return await this.listingAdapter.queryServices(params);
        }

        case 'teams': {
          return await this.listingAdapter.queryTeams(params);
        }

        case 'talent': {
          return await this.userAdapter.queryTalent(params);
        }

        case 'guides':
        case 'courses':
        case 'collections': {
          this.logger.warn(`Entity type '${rule.entity}' not yet implemented`);
          return { items: [], hasMore: false };
        }

        default: {
          this.logger.error(`Unknown entity type: ${rule.entity}`);
          return { items: [], hasMore: false };
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to execute rule for ${rule.entity}: ${error.message}`
      );
      return { items: [], hasMore: false };
    }
  }

  /**
   * Map rule kind to adapter order parameter
   */
  private mapKindToOrder(kind: string): 'top_rated' | 'trending' | 'new' {
    const kindMap: Record<string, 'top_rated' | 'trending' | 'new'> = {
      'top_rated': 'top_rated',
      'trending': 'trending',
      'new': 'new',
      'curated': 'new',  // Curated uses 'new' ordering
    };

    return kindMap[kind] || 'top_rated';
  }
}
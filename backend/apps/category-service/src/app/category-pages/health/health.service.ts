/**
 *  Page Health Checker - Service
 * Checks if category pages have enough content to publish
 */

import { Injectable, Logger } from '@nestjs/common';
import { HealthCheck, HealthSummary, HealthAssessmentOptions } from './health.types';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  
  // ========================================
  // Configuration from environment variables
  // ========================================
  
  /**
   * Minimum rows for grid blocks (from env)
   * Default: 2 rows
   */
  private readonly MIN_GRID_ROWS = Number(
    process.env.PAGE_HEALTH_MIN_GRID_ROWS || 2
  );

  /**
   * Minimum pages for carousel blocks (from env)
   * Default: 3 pages
   */
  private readonly MIN_CAROUSEL_PAGES = Number(
    process.env.PAGE_HEALTH_MIN_CAROUSEL_PAGES || 3
  );

  /**
   * Cards per row/page (matches frontend grid-cols-4)
   * This is hardcoded because frontend has it hardcoded
   */
  private readonly CARDS_PER_ROW = 4;

  // ========================================
  // Main Assessment Method
  // ========================================

  /**
   * Assess if a category page has enough content to be published
   * 
   * @param options - Blocks to check
   * @returns Summary with pass/fail and detailed checks
   */
  async assess(options: HealthAssessmentOptions): Promise<HealthSummary> {
    this.logger.log(
      `Assessing health for ${options.blocks.length} block(s)...`
    );

    // Check each block
    const checks: HealthCheck[] = options.blocks.map((block, index) => {
      this.logger.log(
        `Block ${index + 1}: ${block.entity} - ${block.items.length} items`
      );
    
      // All blocks are grid now (no carousel)
      return this.checkGrid(block);
    });

    // Overall pass = all blocks pass
    const pass = checks.every(c => c.pass);
    const passCount = checks.filter(c => c.pass).length;

    this.logger.log(
      `Health result: ${pass ? 'PASS' : 'FAIL'} | ` +
      `${passCount}/${checks.length} blocks ready`
    );

    return { pass, checks };
  }

  // ========================================
  // Block Type Checkers
  // ========================================

  /**
   * Check if grid block meets minimum requirements
   * Grid = normal card layout (4 cards per row)
   * 
   * @param block - Block to check
   * @returns Health check result
   */
  private checkGrid(block: any): HealthCheck {
    const required = this.MIN_GRID_ROWS * this.CARDS_PER_ROW;
    const pass = block.items.length >= required;

    const result: HealthCheck = {
      entity: block.entity,
      type: 'grid',
      items: block.items.length,
      required,
      pass,
      reason: pass
        ? `Has ${this.MIN_GRID_ROWS}+ rows (${block.items.length}/${required} items)`
        : `Needs ${this.MIN_GRID_ROWS} rows (${block.items.length}/${required} items)`,
    };

    this.logger.log(
      `  Grid check [${block.entity}]: ${pass ? 'PASS' : 'FAIL'} - ${result.reason}`
    );

    return result;
  }

  /**
   * Check if carousel block meets minimum requirements
   * Carousel = horizontal scrolling (4 cards per page)
   * 
   * @param block - Block to check
   * @returns Health check result
   */

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Get current configuration (for debugging)
   */
  getConfig() {
    return {
      minGridRows: this.MIN_GRID_ROWS,
      minCarouselPages: this.MIN_CAROUSEL_PAGES,
      cardsPerRow: this.CARDS_PER_ROW,
      minGridItems: this.MIN_GRID_ROWS * this.CARDS_PER_ROW,
      minCarouselItems: this.MIN_CAROUSEL_PAGES * this.CARDS_PER_ROW,
    };
  }
}
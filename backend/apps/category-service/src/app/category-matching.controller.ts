import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CategoryMatchingService } from './category-matching.service';

/**
 * RabbitMQ request/response surface for semantic category matching.
 *
 * MessagePattern rather than EventPattern because callers need the answer
 * back: user-service blocks on it while building the Algolia payload, and
 * search-service's DB fallback needs it to filter a result page. HTTP between
 * services is an SOP violation, so this is the only way in.
 */
@Controller()
export class CategoryMatchingController {
  private readonly logger = new Logger(CategoryMatchingController.name);

  constructor(private readonly matching: CategoryMatchingService) {}

  /** Derive categories for one profile from its job titles / work-history roles. */
  @MessagePattern('category.match')
  async match(@Payload() payload: { texts?: string[] }) {
    try {
      return await this.matching.matchTexts(payload?.texts ?? []);
    } catch (err) {
      // Callers treat an empty result as "no categories derived" and carry on.
      // Throwing here would fail a talent profile save over a taxonomy read.
      this.logger.error(
        `category.match failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { categories: [], subcategories: [] };
    }
  }

  /** Filter a candidate set down to those matching the user's picked categories. */
  @MessagePattern('category.match_filter')
  async matchFilter(
    @Payload()
    payload: {
      selected?: string[];
      candidates?: { id: string; texts: string[] }[];
    },
  ) {
    try {
      return await this.matching.matchCandidates(
        payload?.selected ?? [],
        payload?.candidates ?? [],
      );
    } catch (err) {
      this.logger.error(
        `category.match_filter failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  /** Published taxonomy names, used as the search sidebar's facet-value fallback. */
  @MessagePattern('category.names')
  async names() {
    try {
      return await this.matching.listCategoryNames();
    } catch (err) {
      this.logger.error(
        `category.names failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { categories: [], subcategories: [] };
    }
  }
}

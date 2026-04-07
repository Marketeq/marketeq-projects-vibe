import { TaxonomyGroup } from '../types/taxonomy.types';
import { EditorialContent } from '../types/editorial.types';

/**
 * CmsAdapter Interface
 *
 * Defines contract for fetching Taxonomy Groups and Editorial content from the CMS.
 */
export abstract class CmsAdapter {
  /**
   * Fetch taxonomy groups for a specific category
   * @param categoryUuid - Category UUID to fetch rules for
   * @returns Array of taxonomy groups with rules
   */
  abstract getTaxonomyGroups(categoryUuid: string): Promise<TaxonomyGroup[]>;

  /**
   * Fetch editorial content for a category
   * @param categoryUuid - Category UUID to fetch editorial for
   * @returns Editorial content or null if none exists
   */
  abstract getEditorial(categoryUuid: string): Promise<EditorialContent | null>;
}

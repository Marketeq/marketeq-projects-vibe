import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { SuggestionsAdapter } from './suggestions.adapter';
import {
  CategoryPageSuggestions,
  BuildSuggestionsParams,
  SuggestedCategory,
  SuggestedSkill,
} from '../types/suggestions.types';
import { CategoryEntity } from '../../entities/category.entity';
import { TagEntity } from '../../entities/tag.entity';

/**
 * Mock implementation of SuggestionsAdapter
 * Uses simple heuristics until real embeddings are available
 * 
 * Strategy:
 * - Related: Categories with shared tags → same parent → any published
 * - Trending: Recently updated categories
 * - Popular: Categories with most children
 * - Skills: Tags from current category → fallback to recent tags
 */
@Injectable()
export class SuggestionsAdapterMock extends SuggestionsAdapter {
  private readonly logger = new Logger(SuggestionsAdapterMock.name);

  constructor(
    @InjectRepository(CategoryEntity)
    private categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(TagEntity)
    private tagRepo: Repository<TagEntity>,
  ) {
    super();
  }

  async buildSuggestions(params: BuildSuggestionsParams): Promise<CategoryPageSuggestions> {
    this.logger.log(`Building suggestions for category: ${params.currentCategoryUuid}`);

    const limits = {
      related: params.limit?.related || 6,
      trending: params.limit?.trending || 6,
      popular: params.limit?.popular || 6,
      skills: params.limit?.skills || 12,
    };

    const [relatedCategories, trendingCategories, popularCategories, relatedSkills] =
      await Promise.all([
        this.getRelatedCategories(params.currentCategoryUuid, limits.related),
        this.getTrendingCategories(limits.trending),
        this.getPopularCategories(limits.popular),
        this.getRelatedSkills(params.currentCategorySlug, limits.skills),
      ]);

    this.logger.log(
      `Built suggestions: ${relatedCategories.length} related, ` +
      `${trendingCategories.length} trending, ` +
      `${popularCategories.length} popular, ` +
      `${relatedSkills.length} skills`
    );

    return {
      relatedCategories,
      trendingCategories,
      popularCategories,
      relatedSkills,
    };
  }

  async getRelatedCategories(categoryUuid: string, limit: number): Promise<SuggestedCategory[]> {
    this.logger.log(`Getting related categories for: ${categoryUuid}, limit: ${limit}`);

    try {
      const currentCategory = await this.categoryRepo.findOne({
        where: { uuid: categoryUuid },
        relations: ['tags', 'parent'],
      });

      if (!currentCategory) {
        this.logger.warn(`Category not found: ${categoryUuid}`);
        return [];
      }

      let related: CategoryEntity[] = [];

      // Strategy 1: Categories with shared tags (semantic similarity proxy)
      if (currentCategory.tags && currentCategory.tags.length > 0) {
        const tagIds = currentCategory.tags.map(t => t.id);

        related = await this.categoryRepo
          .createQueryBuilder('category')
          .leftJoinAndSelect('category.tags', 'tag')
          .leftJoinAndSelect('category.parent', 'parent')
          .where('tag.id IN (:...tagIds)', { tagIds })
          .andWhere('category.uuid != :currentUuid', { currentUuid: categoryUuid })
          .andWhere('category.published_in_marketplace = :published', { published: true })
          .take(limit)
          .getMany();

        this.logger.log(`Found ${related.length} categories with shared tags`);
      }

      // Strategy 2: If not enough, get siblings (same parent)
      if (related.length < limit && currentCategory.parentId) {
        const siblings = await this.categoryRepo.find({
          where: {
            parentId: currentCategory.parentId,
            uuid: Not(categoryUuid),
            published_in_marketplace: true,
          },
          relations: ['parent'],
          take: limit - related.length,
        });

        this.logger.log(`Found ${siblings.length} sibling categories`);
        related = [...related, ...siblings];
      }

      // Strategy 3: If still not enough, get other published categories
      if (related.length < limit) {
        const others = await this.categoryRepo.find({
          where: {
            uuid: Not(categoryUuid),
            published_in_marketplace: true,
          },
          relations: ['parent'],
          take: limit - related.length,
          order: { created_at: 'DESC' },
        });

        this.logger.log(`Added ${others.length} other published categories`);
        related = [...related, ...others];
      }

      // Remove duplicates and limit
      const uniqueRelated = Array.from(new Map(related.map(cat => [cat.uuid, cat])).values());
      
      return uniqueRelated.slice(0, limit).map(cat => this.formatSuggestedCategory(cat));
    } catch (error) {
      this.logger.error(`Failed to get related categories: ${error.message}`);
      return [];
    }
  }

  async getTrendingCategories(limit: number): Promise<SuggestedCategory[]> {
    this.logger.log(`Getting trending categories, limit: ${limit}`);

    try {
      // Mock: Recently updated + published categories
      // Real implementation would use analytics data (views, clicks, etc.)
      const trending = await this.categoryRepo.find({
        where: { published_in_marketplace: true },
        relations: ['parent'],
        order: { updated_at: 'DESC' },
        take: limit,
      });

      this.logger.log(`Found ${trending.length} trending categories`);

      return trending.map(cat => this.formatSuggestedCategory(cat));
    } catch (error) {
      this.logger.error(`Failed to get trending categories: ${error.message}`);
      return [];
    }
  }

  async getPopularCategories(limit: number): Promise<SuggestedCategory[]> {
    this.logger.log(`Getting popular categories, limit: ${limit}`);
  
    try {
      // Mock: Return categories with most children (parent categories)
      // Real implementation will use analytics data (most viewed/clicked)
      const allCategories = await this.categoryRepo.find({
        where: { published_in_marketplace: true },
        relations: ['parent', 'children'],
        take: 50, // Get enough to sort
      });
  
      // Sort by number of children (descending)
      const sorted = allCategories
        .filter(cat => cat.children && cat.children.length > 0)
        .sort((a, b) => (b.children?.length || 0) - (a.children?.length || 0))
        .slice(0, limit);
  
      this.logger.log(`Found ${sorted.length} popular categories (with children)`);
  
      return sorted.map(cat => this.formatSuggestedCategory(cat));
    } catch (error) {
      this.logger.error(`Failed to get popular categories: ${error.message}`);
      return [];
    }
  }

  async getRelatedSkills(categorySlug: string, limit: number): Promise<SuggestedSkill[]> {
    this.logger.log(`Getting related skills for: ${categorySlug}, limit: ${limit}`);

    try {
      const category = await this.categoryRepo.findOne({
        where: { slug: categorySlug },
        relations: ['tags'],
      });

      if (!category || !category.tags || category.tags.length === 0) {
        this.logger.log('No tags found for category, using popular tags fallback');
        
        // Fallback: return some popular tags
        const popularTags = await this.tagRepo.find({
          take: limit,
          order: { created_at: 'DESC' },
        });

        return popularTags.map(tag => this.formatSuggestedSkill(tag));
      }

      this.logger.log(`Found ${category.tags.length} tags for category`);

      // Return tags associated with this category
      return category.tags.slice(0, limit).map(tag => this.formatSuggestedSkill(tag));
    } catch (error) {
      this.logger.error(`Failed to get related skills: ${error.message}`);
      return [];
    }
  }

  /**
   * Format category entity as suggested category
   */
  private formatSuggestedCategory(category: CategoryEntity): SuggestedCategory {
    const slugPath = this.buildSlugPath(category);
    const level = slugPath.length as 1 | 2 | 3;

    return {
      uuid: category.uuid,
      level,
      name: category.name,
      slugPath,
      link: `/c/${slugPath.join('/')}`,
    };
  }

  /**
   * Format tag entity as suggested skill
   */
  private formatSuggestedSkill(tag: TagEntity): SuggestedSkill {
    return {
      name: tag.name,
      slug: tag.slug,
      link: `/skills/${tag.slug}`,
    };
  }

  /**
   * Build slug path from category (includes parent if exists)
   */
  private buildSlugPath(category: CategoryEntity): string[] {
    const path: string[] = [category.slug];

    if (category.parent) {
      path.unshift(category.parent.slug);
      
      // Could extend this to support L3 (grandparent)
      // For now, supports up to L2 (parent + current)
    }

    return path;
  }
}
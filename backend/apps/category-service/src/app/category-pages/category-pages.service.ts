import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CategoryEntity } from '../entities/category.entity';
import { TagEntity } from '../entities/tag.entity';
import { CmsAdapter } from './adapters/cms.adapter';
import { EvaluatorFactory } from './evaluators/evaluator-factory';
import { Rule, BlockSpec } from './types/taxonomy.types';  // ← ADD BlockSpec
import { SuggestionsAdapter } from './suggestions/suggestions.adapter';
import { EditorialContent } from './types/editorial.types';
import { HealthService } from './health/health.service';

interface PageQueryParams {
  kind?: 'show-all' | 'projects' | 'services' | 'teams' | 'talent';
  cursor?: string;
  limit?: number;
  /** Admin/doc: preview=1 + x-preview-token matching PREVIEW_TOKEN */
  allowPreview?: boolean;
}

@Injectable()
export class CategoryPagesService {
  private readonly logger = new Logger(CategoryPagesService.name);

  constructor(
    @InjectRepository(CategoryEntity)
    private categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(TagEntity)
    private tagRepo: Repository<TagEntity>,
    private readonly cmsAdapter: CmsAdapter,
    private readonly evaluatorFactory: EvaluatorFactory,
    private readonly suggestionsAdapter: SuggestionsAdapter,
    private readonly healthService: HealthService,
  ) {}

  async upsertCategory(entry: any) {
    if (!entry || !entry.slug) {
      this.logger.warn('Skipping invalid category entry:', entry);
      return;
    }
  
    let category = await this.categoryRepo.findOne({
      where: { uuid: entry.uuid || entry.documentId },
      relations: ['tags'],
    });
  
    const isNew = !category;
  
    if (!category) {
      category = this.categoryRepo.create({
        uuid: entry.uuid || entry.documentId,
      });
    }
  
    category.name = entry.name;
    category.slug = entry.slug;
    category.seo_meta_title = entry.seo_meta_title || null;
    category.seo_meta_description = entry.seo_meta_description || null;
    category.published_in_marketplace = entry.published_in_marketplace ?? true;
    category.approved = entry.approved ?? false;
  
    const parentData = entry.parent;
  
    if (parentData && typeof parentData === 'object' && parentData.uuid) {
      const parent = await this.categoryRepo.findOne({
        where: { uuid: parentData.uuid },
      });
  
      if (parent) {
        category.parentId = parent.id;
        this.logger.log(`Linked "${entry.slug}" to parent "${parent.slug}"`);
      } else {
        this.logger.warn(`Parent "${parentData.uuid}" not found for "${entry.slug}"`);
        if (!isNew && !category.parentId) {
          const existing = await this.categoryRepo.findOne({
            where: { id: category.id },
            select: ['id', 'parentId']
          });
          if (existing) {
            category.parentId = existing.parentId;
          }
        }
      }
    } else if (parentData === null && !isNew) {
      category.parentId = null;
      this.logger.log(`Removed parent from "${entry.slug}"`);
    } else if (!isNew) {
      if (!category.parentId) {
        const existing = await this.categoryRepo.findOne({
          where: { id: category.id },
          select: ['id', 'parentId']
        });
        
        if (existing && existing.parentId !== undefined) {
          category.parentId = existing.parentId;
          this.logger.log(`Preserving existing parentId for "${entry.slug}"`);
        }
      } else {
        this.logger.log(`Keeping parentId for "${entry.slug}"`);
      }
    }
  
    if (Array.isArray(entry.tags)) {
      if (entry.tags.length > 0) {
        const tagEntities: TagEntity[] = [];
  
        for (const tagData of entry.tags) {
          const tagUuid = tagData.uuid || tagData.documentId;
          const tagSlug = tagData.slug;
  
          if (!tagSlug) continue;
  
          let tag = await this.tagRepo.findOne({ where: { slug: tagSlug } });
  
          if (!tag) {
            tag = this.tagRepo.create({
              uuid: tagUuid,
              name: tagData.name || tagSlug,
              slug: tagSlug,
            });
            tag = await this.tagRepo.save(tag);
            this.logger.log(`Created new tag: ${tagSlug}`);
          } else {
            tag.name = tagData.name || tag.name;
            tag.uuid = tagUuid || tag.uuid;
            tag = await this.tagRepo.save(tag);
          }
  
          tagEntities.push(tag);
        }
  
        category.tags = tagEntities;
        this.logger.log(`Linked ${tagEntities.length} tags to "${entry.slug}"`);
      } else if (isNew) {
        category.tags = [];
      } else {
        this.logger.log(`Empty tags in webhook for "${entry.slug}" - keeping existing tags`);
      }
    }
  
    await this.categoryRepo.save(category);
  
    if (isNew) {
      this.logger.log(`Created category: ${entry.slug}`);
    } else {
      this.logger.log(`Updated category: ${entry.slug}`);
    }
  }

  async upsertTag(entry: any) {
    if (!entry?.slug || !entry?.name) {
      this.logger.warn('Missing tag fields:', entry);
      return;
    }

    let tag = await this.tagRepo.findOne({ where: { slug: entry.slug } });

    if (tag) {
      tag.name = entry.name;
      tag.uuid = entry.uuid || entry.documentId || tag.uuid;
      await this.tagRepo.save(tag);
      this.logger.log(`Updated tag: ${entry.name}`);
    } else {
      tag = this.tagRepo.create({
        uuid: entry.uuid || entry.documentId,
        name: entry.name,
        slug: entry.slug,
      });
      await this.tagRepo.save(tag);
      this.logger.log(`Created tag: ${entry.name}`);
    }
  }


// ========================================
// UPDATED buildBlocks Method
// Fixed: Pagination (10 rows not 10 items)
// Added: Hide/show filtering
// ========================================
// UPDATED buildBlocks Method
// ✅ Fixed: Pagination (10 rows not 10 items)
// ✅ Added: Hide/show filtering
// ========================================

private async buildBlocks(
  categoryUuid: string,
  pageKind: string = 'show-all',
  cursor?: string,
  limit: number = 10,  // This now means ROWS not items
): Promise<BlockSpec[]> {
  try {
    this.logger.log(
      `Building blocks for category ${categoryUuid}, ` +
      `pageKind: ${pageKind}, rows: ${limit}`  // Changed log message
    );

    // Fetch Taxonomy Groups from CMS
    const taxonomyGroups = await this.cmsAdapter.getTaxonomyGroups(categoryUuid);

    if (taxonomyGroups.length === 0) {
      this.logger.warn(`No taxonomy groups found for category ${categoryUuid}`);
      return [];
    }

    // Get all rules from groups
    const allRules = taxonomyGroups.flatMap(group => group.rules || []);
    this.logger.log(`Found ${allRules.length} total rules`);

    // ========================================
    // NEW: Filter out HIDDEN rules
    // ========================================
    const visibleRules = allRules.filter(rule => !rule.hidden);
    
    if (visibleRules.length < allRules.length) {
      this.logger.log(
        `Filtered out ${allRules.length - visibleRules.length} hidden rule(s)`
      );
    }

    // Filter by pageKind
    const relevantRules = visibleRules.filter(rule => 
      !rule.type || rule.type === 'any' || rule.type === pageKind
    );
    
    this.logger.log(`${relevantRules.length} rules match pageKind '${pageKind}'`);

    if (relevantRules.length === 0) {
      return [];
    }

    // Execute rules with updated options
    const blocks = await Promise.all(
      relevantRules.map(async (rule, index): Promise<BlockSpec | null> => {
        try {
          this.logger.log(
            `Executing rule ${index + 1}/${relevantRules.length}: ` +
            `${rule.entity} (${rule.kind})`
          );

          // ========================================
          // CRITICAL: Pass rowsPerPage (not total items)
          // ========================================
          const result = await this.evaluatorFactory.executeRule(
            rule,
            categoryUuid,
            {
              cursor,
              rowsPerPage: limit,  // NOW: Means 10 ROWS
            }
          );

          this.logger.log(
            `Rule ${index + 1} returned ${result.items.length} items, ` +
            `hasMore: ${result.hasMore}`
          );

          // Build block spec
          const block: BlockSpec = {
            key: `rule-${index}`,
            type: 'grid',                              // CHANGED: Always grid
            entity: rule.entity,
            title: rule.name || this.getBlockTitle(rule),  // CHANGED: Use rule.name
            description: this.getBlockDescription(rule),
            items: result.items,
            pagination: result.nextCursor ? {
              nextCursor: result.nextCursor,
              hasMore: result.hasMore,
            } : undefined,
            viewMoreUrl: this.getViewMoreUrl(categoryUuid, rule.entity),
            // REMOVED: carousel field
          };
          return block;
        } catch (error) {
          this.logger.error(`Rule execution failed: ${error.message}`);
          return null;
        }
      })
    );

    // Filter out failed executions
    const validBlocks = blocks.filter(
      (block): block is BlockSpec => block !== null
    );
    
    this.logger.log(`Built ${validBlocks.length} blocks`);
    // ========================================
    // Document 7: Test health checker
    // ========================================
    if (process.env.NODE_ENV === 'development' && validBlocks.length > 0) {
      try {
        const healthResult = await this.healthService.assess({ blocks: validBlocks });
        
        this.logger.log('='.repeat(50));
        this.logger.log('🏥 PAGE HEALTH CHECK:');
        this.logger.log(`Overall: ${healthResult.pass ? ' PASS' : ' FAIL'}`);
        healthResult.checks.forEach(check => {
          const icon = check.pass ? '✅' : '❌';
          this.logger.log(`  ${icon} ${check.entity}: ${check.reason}`);
        });
        this.logger.log('='.repeat(50));
      } catch (error) {
        this.logger.error('Health check error:', error.message);
      }
    }

    return validBlocks;
  } catch (error) {
    this.logger.error(`Failed to build blocks: ${error.message}`);
    return [];
  }
  
}

/**
 * Generate "View More" URL for a block
 * Opens the filtered view for that entity type
 */
private getViewMoreUrl(categoryUuid: string, entity: string): string {
  // Note: Using UUID here, ideally would use slug but we don't have it in this context
  // Frontend can transform this or we can look up the slug
  return `/api/category-pages/${categoryUuid}?kind=${entity}`;
}

/**
 * Get display title for a block based on rule kind
 */
private getBlockTitle(rule: Rule): string {
  const defaults: Record<string, string> = {
    'top_rated': 'Top Rated',
    'trending': 'Trending Now',
    'new': 'Recently Added',
    'curated': 'Curated Selection',
  };
  return defaults[rule.kind] || rule.kind;
}

/**
 * Get display description for a block based on rule kind
 */
private getBlockDescription(rule: Rule): string {
  const defaults: Record<string, string> = {
    'top_rated': 'Highest rated',
    'trending': 'Most popular right now',
    'new': 'Latest additions',
    'curated': 'Hand-picked content',
  };
  return defaults[rule.kind] || '';
}
  async getCategoryPageBySlug(slug: string, params: PageQueryParams = {}) {
    // Just delegate to new method for backward compatibility
    return this.getCategoryPageBySlugPath([slug], params);
  }

  /**
   * Get category page by slug path (supports L1/L2/L3)
   * This replaces getCategoryPageBySlug for multi-level support
   */
  async getCategoryPageBySlugPath(slugParts: string[], params: PageQueryParams = {}) {
    this.logger.log(
      `Fetching category page for path: ${slugParts.join('/')}, kind: ${params.kind || 'show-all'}, preview: ${!!params.allowPreview}`
    );
    
    const category = await this.findCategoryBySlugPath(slugParts);
    
    if (!category) {
      throw new NotFoundException(
        `Category not found at path: ${slugParts.join('/')}`
      );
    }

    // Doc / admin publishing: hide non-marketplace pages unless preview is authorized
    if (!params.allowPreview && !category.published_in_marketplace) {
      throw new NotFoundException(
        `Category not found at path: ${slugParts.join('/')}`
      );
    }
    
    // Same logic as getCategoryPageBySlug
    const breadcrumbs = await this.buildBreadcrumbs(category);
    const siblings = await this.getSiblingCategories(category);
    const relatedCategories = await this.getRelatedCategories(category);
    
    const blocks = await this.buildBlocks(
      category.uuid,
      params.kind || 'show-all',
      params.cursor,
      params.limit || 10
    );
    
    const suggestions = await this.suggestionsAdapter.buildSuggestions({
      currentCategoryUuid: category.uuid,
      currentCategorySlug: category.slug,
      limit: {
        related: 6,
        trending: 6,
        popular: 6,
        skills: 12,
      },
    });
    const editorial = await this.cmsAdapter.getEditorial(category.uuid);

    const level = slugParts.length as 1 | 2 | 3;
    const slugPath = [...slugParts];
    const uuids = this.breadcrumbUuids(breadcrumbs);
    const origin = (
      process.env.PUBLIC_SITE_ORIGIN ||
      process.env.FE_ORIGIN ||
      'http://localhost:3000'
    ).replace(/\/+$/, '');
    const defaultCanonical = `${origin}/c/${slugPath.join('/')}`;

    const seo = {
      title:
        editorial?.seoOverride?.title ??
        category.seo_meta_title ??
        category.name,
      description:
        editorial?.seoOverride?.description ??
        category.seo_meta_description ??
        '',
      canonical: editorial?.seoOverride?.canonical ?? defaultCanonical,
      ...(params.allowPreview ? { noindex: true as const } : {}),
    };

    const hero = editorial?.hero;

    const subcategories = (category.children || [])
      .filter((c) => params.allowPreview || c.published_in_marketplace)
      .map((c) => ({
        name: c.name,
        slug: c.slug,
        uuid: c.uuid,
      }));

    const breadcrumbItems = breadcrumbs.map((c) => ({
      name: c.name,
      slug: c.slug,
      uuid: c.uuid,
    }));

    return {
      // Doc: Endpoint Catalog primary shape (Next.js / FE contract)
      level,
      slugPath,
      uuids,
      seo,
      hero,
      subcategories,
      breadcrumbs: breadcrumbItems,
      blocks,
      suggestions,
      pagination: null,
      __preview: !!params.allowPreview,
      // Extended (existing consumers)
      category: this.formatCategory(category),
      parent: category.parent ? this.formatCategoryBasic(category.parent) : null,
      children: category.children?.map(c => this.formatCategoryBasic(c)) || [],
      siblings: siblings.map(c => this.formatCategoryBasic(c)),
      relatedCategories: relatedCategories.map(c => this.formatCategoryBasic(c)),
      tags: category.tags?.map(t => ({
        uuid: t.uuid,
        name: t.name,
        slug: t.slug,
      })) || [],
      editorial: editorial || undefined,
      guides: editorial?.guides,
      courses: editorial?.courses,
      faq: editorial?.faq,
    };
  }

  private breadcrumbUuids(trail: CategoryEntity[]): { l1?: string; l2?: string; l3?: string } {
    const u: { l1?: string; l2?: string; l3?: string } = {};
    if (trail[0]) u.l1 = trail[0].uuid;
    if (trail[1]) u.l2 = trail[1].uuid;
    if (trail[2]) u.l3 = trail[2].uuid;
    return u;
  }

  /**
   * Find category by slug path (supports L1, L2, L3)
   * Examples:
   *   ['creative'] -> L1 category
   *   ['creative', 'ui-design'] -> L2 category
   *   ['creative', 'ui-design', 'mobile-ui'] -> L3 category
   */
  private async findCategoryBySlugPath(slugs: string[]): Promise<CategoryEntity | null> {
    this.logger.log(`Resolving category path: ${slugs.join('/')} (${slugs.length} levels)`);
    
    if (slugs.length === 1) {
      // L1: Root category (parentId must be null)
      return await this.categoryRepo.findOne({
        where: { slug: slugs[0], parentId: IsNull() },
        relations: ['parent', 'children', 'tags'],
      });
    }
    
    if (slugs.length === 2) {
      // L2: Find parent first, then child
      const parent = await this.categoryRepo.findOne({
        where: { slug: slugs[0], parentId: IsNull() },
      });
      
      if (!parent) {
        this.logger.warn(`Parent category '${slugs[0]}' not found`);
        return null;
      }
      
      return await this.categoryRepo.findOne({
        where: { slug: slugs[1], parentId: parent.id },
        relations: ['parent', 'children', 'tags'],
      });
    }
    
    if (slugs.length === 3) {
      // L3: Find L1, then L2, then L3
      const l1 = await this.categoryRepo.findOne({
        where: { slug: slugs[0], parentId: IsNull() },
      });
      
      if (!l1) {
        this.logger.warn(`L1 category '${slugs[0]}' not found`);
        return null;
      }
      
      const l2 = await this.categoryRepo.findOne({
        where: { slug: slugs[1], parentId: l1.id },
      });
      
      if (!l2) {
        this.logger.warn(`L2 category '${slugs[1]}' not found under '${slugs[0]}'`);
        return null;
      }
      
      return await this.categoryRepo.findOne({
        where: { slug: slugs[2], parentId: l2.id },
        relations: ['parent', 'children', 'tags'],
      });
    }
    
    this.logger.error(`Invalid path depth: ${slugs.length} (max 3 levels)`);
    return null;
  }

  private async buildBreadcrumbs(category: CategoryEntity): Promise<CategoryEntity[]> {
    const trail: CategoryEntity[] = [];
    let current: CategoryEntity | null = category;
    let depth = 0;

    while (current && depth < 10) {
      trail.unshift(current);

      if (current.parentId) {
        current = await this.categoryRepo.findOne({
          where: { id: current.parentId },
        });
      } else {
        current = null;
      }
      depth++;
    }

    return trail;
  }

  private async getSiblingCategories(category: CategoryEntity): Promise<CategoryEntity[]> {
    if (!category.parentId) {
      const rootCategories = await this.categoryRepo
        .createQueryBuilder('category')
        .where('category.parentId IS NULL')
        .getMany();
      
      return rootCategories.filter(c => c.id !== category.id);
    }
  
    const siblings = await this.categoryRepo
      .createQueryBuilder('category')
      .where('category.parentId = :parentId', { parentId: category.parentId })
      .getMany();
  
    return siblings.filter(s => s.id !== category.id);
  }

  private async getRelatedCategories(category: CategoryEntity): Promise<CategoryEntity[]> {
    if (!category.tags || category.tags.length === 0) {
      return [];
    }

    const tagIds = category.tags.map(t => t.id);

    try {
      const related = await this.categoryRepo
        .createQueryBuilder('category')
        .leftJoinAndSelect('category.tags', 'tag')
        .where('tag.id IN (:...tagIds)', { tagIds })
        .andWhere('category.id != :currentId', { currentId: category.id })
        .andWhere('category.published_in_marketplace = :published', { published: true })
        .take(5)
        .getMany();

      return related;
    } catch (error) {
      this.logger.warn(`Could not fetch related categories: ${error.message}`);
      return [];
    }
  }

  private formatCategory(category: CategoryEntity) {
    return {
      uuid: category.uuid,
      name: category.name,
      slug: category.slug,
      seo: {
        title: category.seo_meta_title || category.name,
        description: category.seo_meta_description || '',
      },
      approved: category.approved,
      publishedInMarketplace: category.published_in_marketplace,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    };
  }

  private formatCategoryBasic(category: CategoryEntity) {
    return {
      uuid: category.uuid,
      name: category.name,
      slug: category.slug,
    };
  }
}
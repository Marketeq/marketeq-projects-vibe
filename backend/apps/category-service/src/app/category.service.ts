import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, IsNull } from 'typeorm';
import { randomUUID } from 'crypto';

import { CategoryEntity } from './entities/category.entity';
import { TagEntity } from './entities/tag.entity';
import { CategoryDto } from './dto/category.dto';
import { ContentService } from '../content/content.service';

/** tiny slugify helper */
function slugify(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** ultra-light spell fixer (keeps it deterministic for now) */
function fuzzySpellcheck(s: string) {
  return s.replace(/\bnext\.?js\b/gi, 'Next.js').trim();
}

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @InjectRepository(CategoryEntity)
    private readonly catRepo: Repository<CategoryEntity>,
    @InjectRepository(TagEntity)
    private readonly tagRepo: Repository<TagEntity>,
    private readonly http: HttpService,
    private readonly contentService: ContentService,
  ) {}

  // ---------------------------------------------------------
  // Strapi -> Nest upsert
  // ---------------------------------------------------------
  async syncFromStrapi(dto: CategoryDto): Promise<void> {
    // 1) Upsert tags first (by slug; create if missing)
    const tagEntities: TagEntity[] = [];
    for (const t of dto.tags ?? []) {
      if (!t?.slug) continue;
      let tag = await this.tagRepo.findOne({ where: { slug: t.slug } });
      if (!tag) {
        tag = this.tagRepo.create({
          uuid: t.uuid ?? null,
          name: t.name ?? t.slug,
          slug: t.slug,
        });
      } else {
        tag.name = t.name ?? tag.name;
        tag.uuid = t.uuid ?? tag.uuid;
      }
      tag = await this.tagRepo.save(tag);
      tagEntities.push(tag);
    }
  
    // 2) Find/create the category by uuid
    let cat = await this.catRepo.findOne({
      where: { uuid: dto.uuid },
      relations: ['parent', 'tags'],
    });
    
    const isNew = !cat;
    
    if (!cat) {
      cat = this.catRepo.create({ uuid: dto.uuid });
    }
  
    // 3) Assign basic fields
    cat.name = dto.name;
    cat.slug = dto.slug;
    cat.seo_meta_title = dto.seo_meta_title ?? undefined;
    cat.seo_meta_description = dto.seo_meta_description ?? undefined;
    cat.approved = !!dto.approved;
    cat.published_in_marketplace = !!dto.published_in_marketplace;
  
    // 4) Resolve parent by uuid — WITH PROTECTION against clearing existing values
    if (dto.parent) {
      // Parent UUID provided - update it
      const parent = await this.catRepo.findOne({ where: { uuid: dto.parent } });
      if (parent) {
        cat.parent = ({ id: parent.id } as any);
      } else {
        this.logger.warn(`Parent ${dto.parent} not found for ${dto.slug}`);
        // Keep existing parent if not found
        if (!isNew && !cat.parent) {
          const existing = await this.catRepo.findOne({
            where: { id: cat.id },
            select: ['id'],
            relations: ['parent']
          });
          if (existing?.parent) {
            cat.parent = existing.parent;
          }
        }
      }
    } else if (dto.parent === null && !isNew) {
      // Explicitly null - user wants to remove parent
      cat.parent = null;
      this.logger.log(`Removed parent from ${dto.slug}`);
    } else if (!isNew) {
      // For existing categories: parent not in payload - KEEP EXISTING
      if (!cat.parent) {
        const existing = await this.catRepo.findOne({
          where: { id: cat.id },
          relations: ['parent']
        });
        if (existing?.parent) {
          cat.parent = existing.parent;
          this.logger.log(`Cron sync: Preserving existing parent for ${dto.slug}`);
        }
      }
    }
    // For new categories without parent: cat.parent remains undefined (no parent)
  
    // 5) Attach tags
    cat.tags = tagEntities;

    // 5b) Circular parent check (Nest-side, for AI/user paths and sync updates)
    if (dto.parent) {
      const parentRow = await this.catRepo.findOne({ where: { uuid: dto.parent } });
      if (parentRow) {
        await this.validateParent(dto.uuid, dto.parent);
      }
    }
  
    // 6) Save
    await this.catRepo.save(cat);
    this.logger.log(`Category synced locally: ${cat.uuid} (${cat.slug})`);
  }

  // ---------------------------------------------------------
  // Fallback: pull from Strapi (cron calls this)
  // ---------------------------------------------------------
  public async fallbackSyncFromStrapi(): Promise<void> {
    const base = this.baseStrapiUrl();
    
    // CHANGED: Use populate=* to get all relations
    const url = `${base}/api/categories?populate=*`;
  
    const res = await this.http.axiosRef.get(url, { headers: this.authHeader() });
    const list = Array.isArray(res.data?.data) ? res.data.data : [];
  
    this.logger.log(`Strapi returned ${list.length} categories`);

    for (const raw of list) {
      const dto = this.transformStrapiCategory(raw);
      await this.syncFromStrapi(dto);
    }
    this.logger.log(`Fallback pulled ${list.length} categories from Strapi`);
  }
  // ---------------------------------------------------------
  // Queries
  // ---------------------------------------------------------
  async findBySlug(slug: string): Promise<CategoryEntity> {
    const cat = await this.catRepo.findOne({
      where: { slug },
      relations: ['parent', 'tags'], // Add relations back
    });
  
    if (!cat) {
      throw new NotFoundException(`Category with slug '${slug}' not found`);
    }
  
    return cat;
  }

  async findAll(): Promise<CategoryEntity[]> {
    return this.catRepo.find({
      relations: ['parent', 'tags'],
      order: { name: 'ASC' },
    });
  }

  /** Recursive tree: roots when parentUuid is null/omitted */
  async getCategoryTree(parentUuid: string | null = null): Promise<CategoryEntity[]> {
    const where =
      parentUuid === null || parentUuid === undefined || parentUuid === ''
        ? { parentId: IsNull() }
        : { parent: { uuid: parentUuid } };

    const nodes = await this.catRepo.find({
      where: where as any,
      relations: ['tags', 'parent'],
      order: { name: 'ASC' },
    });

    for (const node of nodes) {
      (node as CategoryEntity & { children?: CategoryEntity[] }).children =
        await this.getCategoryTree(node.uuid);
    }

    return nodes;
  }

  async getBreadcrumbs(uuid: string): Promise<CategoryEntity[]> {
    const path: CategoryEntity[] = [];
    let current = await this.catRepo.findOne({
      where: { uuid },
      relations: ['parent'],
    });
    if (!current) {
      throw new NotFoundException(`Category with uuid '${uuid}' not found`);
    }
    while (current) {
      path.unshift(current);
      if (!current.parentId) break;
      const next = await this.catRepo.findOne({
        where: { id: current.parentId },
        relations: ['parent'],
      });
      if (!next) break;
      current = next;
    }
    return path;
  }

  /**
   * Doc: prevent self-parent and cycles when assigning parent (user/AI/sync).
   */
  async validateParent(childUuid: string, parentUuid: string): Promise<void> {
    if (!parentUuid || !childUuid) return;
    if (childUuid === parentUuid) {
      throw new BadRequestException('Category cannot be its own parent');
    }
    const ancestorsOfParent = await this.getAncestorUuids(parentUuid);
    if (ancestorsOfParent.includes(childUuid)) {
      throw new BadRequestException('Circular reference detected');
    }
  }

  private async getAncestorUuids(fromUuid: string): Promise<string[]> {
    const out: string[] = [];
    let current = await this.catRepo.findOne({
      where: { uuid: fromUuid },
      relations: ['parent'],
    });
    let guard = 0;
    while (current?.parentId && guard++ < 2000) {
      const p = await this.catRepo.findOne({
        where: { id: current.parentId },
        relations: ['parent'],
      });
      if (!p) break;
      out.push(p.uuid);
      current = p;
    }
    return out;
  }

  /** All category UUIDs in subtree rooted at rootUuid (includes root). */
  async getSubtreeUuids(rootUuid: string): Promise<string[]> {
    const root = await this.catRepo.findOne({ where: { uuid: rootUuid } });
    if (!root) throw new NotFoundException('Category not found');
    const acc: string[] = [root.uuid];
    const queue = [root.id];
    let guard = 0;
    while (queue.length && guard++ < 50000) {
      const id = queue.shift()!;
      const children = await this.catRepo.find({ where: { parentId: id } });
      for (const ch of children) {
        acc.push(ch.uuid);
        queue.push(ch.id);
      }
    }
    return acc;
  }

  /**
   * Doc QA: dry-run before delete — no DB changes.
   */
  async deleteDryRun(uuid: string, reassignTo?: string) {
    const cat = await this.catRepo.findOne({
      where: { uuid },
      relations: ['parent', 'children'],
    });
    if (!cat) throw new NotFoundException('Category not found');

    const hasChildren = (cat.children?.length ?? 0) > 0;
    let targetUuid = reassignTo ?? cat.parent?.uuid ?? null;
    if (!targetUuid && hasChildren) {
      targetUuid = process.env.FALLBACK_PARENT_UUID || null;
    }

    const counts = await this.contentService.countByCategory(uuid);
    const sample = await this.contentService.preview(uuid, 20);

    return {
      uuid,
      hasChildren,
      childCount: cat.children?.length ?? 0,
      wouldReassignContentTo: targetUuid,
      canDelete: !hasChildren || !!targetUuid,
      contentCounts: counts,
      contentSample: sample,
      message: hasChildren && !targetUuid
        ? 'Cannot delete: choose reassignTo (or configure FALLBACK_PARENT_UUID).'
        : 'OK to delete with current reassignment target.',
    };
  }

  // ---------------------------------------------------------
  // Helpers for creation
  // ---------------------------------------------------------
  private async generateUniqueSlug(name: string) {
    const base = slugify(name);
    let candidate = base || `cat-${Date.now()}`;
    let i = 1;
    while (await this.catRepo.findOne({ where: { slug: candidate } })) {
      i += 1;
      candidate = `${base}-${i}`;
    }
    return candidate;
  }

  /** Heuristic: map a name to the most likely parent that already exists locally */
  private async mapToLikelyParent(name: string): Promise<CategoryEntity | null> {
    const cleaned = fuzzySpellcheck(name);
    const token =
      cleaned
        .split(/[^\p{L}\p{N}\.]+/u)
        .filter(Boolean)
        .slice(0, 2)
        .join(' ')
        .trim() || cleaned;

    let parent =
      (await this.catRepo.findOne({
        where: { name: ILike(`%${token}%`) },
        order: { id: 'ASC' },
      })) || null;

    // fallback: scan backwards for a capitalized word (no Array.findLast)
    if (!parent) {
      const words = cleaned.split(/\s+/);
      let lastCap: string | null = null;
      for (let i = words.length - 1; i >= 0; i--) {
        if (/[A-Z]/.test(words[i])) {
          lastCap = words[i];
          break;
        }
      }
      if (lastCap) {
        parent =
          (await this.catRepo.findOne({
            where: { name: ILike(`%${lastCap}%`) },
            order: { id: 'ASC' },
          })) || null;
      }
    }

    return parent;
  }

  // ---------------------------------------------------------
  // User-generated subcategories (explicit parent)
  // ---------------------------------------------------------
  async createUserSubcategory(name: string, parentUuid: string) {
    if (!name?.trim() || !parentUuid?.trim()) {
      throw new BadRequestException('name and parentUuid are required');
    }

    const cleanName = name.trim();

    const parent = await this.catRepo.findOne({ where: { uuid: parentUuid } });
    if (!parent) throw new BadRequestException(`Parent category not found locally for uuid=${parentUuid}`);

    const newUuid = randomUUID();
    await this.validateParent(newUuid, parentUuid);

    const slug = await this.generateUniqueSlug(cleanName);

    const saved = await this.catRepo.save(
      this.catRepo.create({
        uuid: newUuid,
        name: cleanName,
        slug,
        approved: true,
        published_in_marketplace: false,
        parent: { id: parent.id } as any,
      }),
    );

    const withParent = await this.catRepo.findOne({
      where: { id: saved.id },
      relations: ['parent'],
    });

    await this.pushCategoryToStrapi({
      ...withParent!,
      approved: true,
      published_in_marketplace: false,
    } as CategoryEntity);

    this.logger.log(`User subcategory created + pushed: ${withParent!.uuid} (${withParent!.slug})`);
    return withParent!;
  }

  // ---------------------------------------------------------
  // User-generated subcategories (moderated; optional parent override)
  // ---------------------------------------------------------
  async createUserSubcategoryModerated(name: string, parentUuid?: string) {
    if (!name?.trim()) {
      throw new BadRequestException('name is required');
    }

    let parent: CategoryEntity | null = null;
    if (parentUuid?.trim()) {
      parent = await this.catRepo.findOne({ where: { uuid: parentUuid } });
      if (!parent) {
        throw new BadRequestException(`Parent category not found locally for uuid=${parentUuid}`);
      }
    } else {
      parent = await this.mapToLikelyParent(name);
      if (!parent) throw new BadRequestException('No relevant parent found for this subcategory');
    }

    const displayName = name.trim();
    const slug = await this.generateUniqueSlug(fuzzySpellcheck(displayName));

    const newUuid = randomUUID();
    await this.validateParent(newUuid, parent.uuid);

    const saved = await this.catRepo.save(
      this.catRepo.create({
        uuid: newUuid,
        name: displayName,
        slug,
        approved: true,
        published_in_marketplace: false,
        parent: { id: parent.id } as any,
      }),
    );

    const withParent = await this.catRepo.findOne({
      where: { id: saved.id },
      relations: ['parent'],
    });

    await this.pushCategoryToStrapi({
      ...withParent!,
      approved: true,
      published_in_marketplace: false,
    } as CategoryEntity);

    this.logger.log(
      `(Moderated) User subcategory created + pushed: ${withParent!.uuid} (${withParent!.slug})`,
    );

    return withParent!;
  }
 
  // ---------------------------------------------------------
  // Delete (safe) — used by webhook + API
  // ---------------------------------------------------------
  async deleteCategory(uuid: string, reassignToUuid?: string): Promise<{ status: string }> {
    const cat = await this.catRepo.findOne({
      where: { uuid },
      relations: ['parent', 'children'],
    });
    if (!cat) throw new NotFoundException('Category not found');

    const hasChildren = (cat.children?.length ?? 0) > 0;

    // Decide target: explicit → parent → env fallback (only if there are children)
    let targetUuid = reassignToUuid ?? cat.parent?.uuid ?? null;
    if (!targetUuid && hasChildren) {
      targetUuid = process.env.FALLBACK_PARENT_UUID || null;
    }

    if (targetUuid) {
      await this.contentService.reassignCategory(uuid, targetUuid);
    }

    // 2) Reparent local children if needed
    if (hasChildren) {
      if (!targetUuid) {
        throw new NotFoundException(
          'Cannot delete a category that has children without a reassignment target.',
        );
      }
      const targetParent =
        (await this.catRepo.findOne({ where: { uuid: targetUuid } })) || cat.parent || null;

      for (const child of cat.children ?? []) {
        child.parent = targetParent as any;
        await this.catRepo.save(child);
      }
    }

    // 3) Remove locally (leaf deletion allowed even without target)
    await this.catRepo.delete({ uuid });

    this.logger.log(`Deleted category ${uuid}${targetUuid ? ` → reassigned to ${targetUuid}` : ''}`);
    return { status: 'deleted' };
  }

  /** Reassign all direct children of `parentUuid` to `newParentUuid` (local DB + content rows). Does not delete `parentUuid`. */
  async reassignChildrenToParent(
    parentUuid: string,
    newParentUuid: string,
  ): Promise<{ updated: number }> {
    const parent = await this.catRepo.findOne({
      where: { uuid: parentUuid },
      relations: ['children'],
    });
    if (!parent) throw new NotFoundException('Parent category not found');

    const newParent = await this.catRepo.findOne({ where: { uuid: newParentUuid } });
    if (!newParent) throw new NotFoundException('New parent category not found');

    const children = parent.children ?? [];
    for (const child of children) {
      await this.contentService.reassignCategory(child.uuid, newParentUuid);
      child.parent = newParent as any;
      await this.catRepo.save(child);
    }
    return { updated: children.length };
  }

  /** Strapi webhook handler (Entry delete) — idempotent */
  async handleStrapiDeleteWebhook(payload: any): Promise<{ status: string; reason?: string }> {
    const uuid = this.extractUuidFromWebhook(payload);
    if (!uuid) {
      this.logger.warn(`Strapi delete webhook missing uuid. Payload keys: ${Object.keys(payload || {})}`);
      return { status: 'ignored', reason: 'no-uuid' };
    }
    try {
      await this.deleteCategory(uuid);
      this.logger.log(`Deleted via Strapi webhook: ${uuid}`);
      return { status: 'ok' };
    } catch (e: any) {
      // If a second webhook (duplicate) arrives after the first succeeded, treat as idempotent
      if (typeof e?.message === 'string' && e.message.includes('Category not found')) {
        this.logger.warn(`Delete via webhook ignored (already deleted): ${uuid}`);
        return { status: 'ignored', reason: 'already-deleted' };
      }
      this.logger.error(`Delete via webhook failed for ${uuid}: ${e?.message || e}`);
      return { status: 'error', reason: e?.message || 'delete-failed' };
    }
  }

  /** Try multiple payload shapes from Strapi v4 */
  private extractUuidFromWebhook(body: any): string | null {
    // Common shapes:
    // { event:'entry.delete', data:{ id, attributes:{ uuid } } }
    // { event:'entry.delete', entry:{ id, uuid } }
    // { uuid: '...' }
    const data = body?.data ?? body?.entry ?? body;
    const attrs = data?.attributes ?? data;
    return attrs?.uuid ?? data?.uuid ?? null;
  }

  // ---------------------------------------------------------
  // Strapi helpers
  // ---------------------------------------------------------
  private baseStrapiUrl(): string {
    return (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/+$/, '');
  }

  /** Same resolution as `content/strapi-client.ts` — avoids silent mismatch when only STRAPI_API_TOKEN is set. */
  private strapiBearerToken(): string | undefined {
    const t = process.env.STRAPI_TOKEN || process.env.STRAPI_API_TOKEN;
    const trimmed = t?.trim();
    return trimmed || undefined;
  }

  private authHeader() {
    const token = this.strapiBearerToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private formatHttpError(error: unknown): string {
    const e = error as any;
    if (e?.response) {
      const st = e.response.status;
      const data = e.response.data;
      const msg =
        data?.error?.message ||
        (typeof data?.message === 'string' ? data.message : null) ||
        e.response.statusText;
      return `HTTP ${st}${msg ? `: ${msg}` : ''}`;
    }
    if (e?.code) return `${e.code}${e.message ? ` (${e.message})` : ''}`;
    if (e instanceof Error && e.message) return e.message;
    return String(error);
  }

  private async findStrapiCategoryIdByUuid(uuid: string): Promise<number | null> {
    const url = `${this.baseStrapiUrl()}/api/categories?filters[uuid][$eq]=${encodeURIComponent(uuid)}`;
    const res = await this.http.axiosRef.get(url, { headers: this.authHeader() });
    const arr = res.data?.data ?? [];
  
    // Handles both top-level and nested attribute structures
    const match = arr.find(
      (item: any) =>
        item?.attributes?.uuid === uuid || item?.uuid === uuid
    );
  
    return match ? match.id : null;
  }
  

  private async findStrapiTagIdBySlug(slug: string): Promise<number | null> {
    const url = `${this.baseStrapiUrl()}/api/tags?filters[slug][$eq]=${encodeURIComponent(slug)}`;
    const res = await this.http.axiosRef.get(url, { headers: this.authHeader() });
    const arr = res.data?.data ?? [];
    return arr.length ? arr[0].id : null;
  }

  public async pushCategoryToStrapi(cat: CategoryEntity): Promise<{ id: number }> {
    // 1) ensure parent exists in Strapi (recursively) to get numeric parentId
    let parentId: number | null = null;

    if (cat.parent?.uuid) {
      parentId = await this.findStrapiCategoryIdByUuid(cat.parent.uuid);
      if (!parentId) {
        const parentLocal = await this.catRepo.findOne({
          where: { uuid: cat.parent.uuid },
          relations: ['parent', 'tags'],
        });
        if (parentLocal) {
          await this.pushCategoryToStrapi(parentLocal); // push parent first
          parentId = await this.findStrapiCategoryIdByUuid(cat.parent.uuid);
        }
      }
    }

    // 2) tags (optional)
    const tagIds: number[] = [];
    for (const t of cat.tags ?? []) {
      const id = await this.findStrapiTagIdBySlug(t.slug);
      if (id) tagIds.push(id);
    }

    // 3) upsert in Strapi
    const existingId = await this.findStrapiCategoryIdByUuid(cat.uuid);
    const payload = {
      data: {
        uuid: cat.uuid,
        name: cat.name,
        slug: cat.slug,
        approved: !!cat.approved,
        published_in_marketplace: !!cat.published_in_marketplace,
        seo_meta_title: cat.seo_meta_title ?? null,
        seo_meta_description: cat.seo_meta_description ?? null,
        ...(parentId ? { parent: parentId } : { parent: null }),
        ...(tagIds.length ? { tags: tagIds } : { tags: [] }),
      },
    };

    if (existingId) {
      const url = `${this.baseStrapiUrl()}/api/categories/${existingId}`;
      const res = await this.http.axiosRef.put(url, payload, { headers: this.authHeader() });
      this.logger.log(`Updated Strapi category #${existingId} from Nest`);
      return { id: res.data?.data?.id };
    } else {
      const url = `${this.baseStrapiUrl()}/api/categories`;
      const res = await this.http.axiosRef.post(url, payload, { headers: this.authHeader() });
      const id = res.data?.data?.id;
      this.logger.log(`Created Strapi category #${id} from Nest`);
      return { id };
    }
  }

  /** Strapi REST -> your DTO */
  private transformStrapiCategory(raw: any): CategoryDto {
    // Handle both nested (v4) and flat (v5) structures
    const a = raw?.attributes ?? raw ?? {};
    
    // CRITICAL FIX: Handle parent with multiple structures
    let parentUuid = null;
    
    if (a.parent) {
      if (typeof a.parent === 'string') {
        // Direct string UUID
        parentUuid = a.parent;
      } else if (a.parent.uuid) {
        // Flat object: { uuid: "..." }
        parentUuid = a.parent.uuid;
      } else if (a.parent.data?.attributes?.uuid) {
        // Nested v4 style: { data: { attributes: { uuid: "..." } } }
        parentUuid = a.parent.data.attributes.uuid;
      } else if (a.parent.data?.uuid) {
        // Nested v4 style: { data: { uuid: "..." } }
        parentUuid = a.parent.data.uuid;
      }
    }
    
    this.logger.debug(`Transform: ${a.slug} → parent=${parentUuid || 'null'}`);
    
    return {
      uuid: a.uuid,
      name: a.name,
      slug: a.slug,
      approved: !!a.approved,
      published_in_marketplace: !!a.published_in_marketplace,
      parent: parentUuid,  // Now correctly extracted!
      tags: (a.tags?.data ?? a.tags ?? []).map((t: any) => {
        const tagData = t?.attributes ?? t;
        return {
          name: tagData?.name,
          slug: tagData?.slug,
          uuid: tagData?.uuid,
        };
      }),
      seo_meta_title: a.seo_meta_title ?? null,
      seo_meta_description: a.seo_meta_description ?? null,
    };
  }

  /** Convenience: create a dummy local category then push it to Strapi */
  public async createAndPushDummyCategory() {
    const saved = await this.catRepo.save(
      this.catRepo.create({
        uuid: randomUUID(),
        name: 'Pushed from Nest',
        slug: 'pushed-from-nest-' + Date.now(),
        approved: true,
        published_in_marketplace: false,
        seo_meta_title: 'SEO from Nest',
        seo_meta_description: 'Meta from Nest',
        tags: [],
      }),
    );

    // reload with relations so controller responses can include parent uuid
    const full = await this.catRepo.findOne({
      where: { id: saved.id },
      relations: ['parent'],
    });

    await this.pushCategoryToStrapi(full!);
    return full!;
  }

  async testStrapiConnection() {
    try {
      const base = this.baseStrapiUrl();
      const url = `${base}/api/categories?populate=*`;
      
      this.logger.log(`Testing Strapi connection: ${url}`);
      
      const res = await this.http.axiosRef.get(url, { 
        headers: this.authHeader() 
      });
      
      this.logger.log(`Strapi connected! Got ${res.data?.data?.length} categories`);
      
      // Find UI Design
      const uiDesign = res.data?.data?.find((cat: any) => 
        cat?.attributes?.slug === 'ui-design' || cat?.slug === 'ui-design'
      );
      
      return {
        success: true,
        totalCategories: res.data?.data?.length,
        uiDesignData: uiDesign,
        hasToken: !!this.strapiBearerToken(),
      };
    } catch (error) {
      const detail = this.formatHttpError(error);
      this.logger.error(`Strapi connection failed: ${detail}`);
      return {
        success: false,
        error: detail,
        hasToken: !!this.strapiBearerToken(),
        strapiUrl: this.baseStrapiUrl(),
      };
    }
  }
}

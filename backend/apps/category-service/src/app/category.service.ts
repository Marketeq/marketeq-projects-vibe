import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, IsNull } from 'typeorm';
import { randomUUID } from 'crypto';

import { CategoryEntity } from './entities/category.entity';
import { TagEntity } from './entities/tag.entity';
import { CategoryDto } from './dto/category.dto';
import { ContentService } from '../content/content.service';
import {
  checkDrugs,
  checkGambling,
  checkPorn,
  checkProfanity,
  checkTobacco,
  validateSubcategory,
} from './category.filters';

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
  // CMS -> Nest upsert
  // ---------------------------------------------------------
  async syncFromCms(dto: CategoryDto): Promise<void> {
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
    if (dto.seo_meta_title !== undefined) cat.seo_meta_title = dto.seo_meta_title ?? undefined;
    if (dto.seo_meta_description !== undefined) cat.seo_meta_description = dto.seo_meta_description ?? undefined;
    cat.approved = !!dto.approved;
    cat.published_in_marketplace = !!dto.published_in_marketplace;

    // 4) Validate parent BEFORE assignment to prevent race conditions
    if (dto.parent) {
      await this.validateParent(dto.uuid, dto.parent);
    }

    // 5) Resolve parent by uuid — WITH PROTECTION against clearing existing values
    if (dto.parent) {
      const parent = await this.catRepo.findOne({ where: { uuid: dto.parent } });
      if (parent) {
        cat.parent = ({ id: parent.id } as any);
      } else {
        this.logger.warn(`Parent ${dto.parent} not found for ${dto.slug}`);
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
      cat.parent = null;
      this.logger.log(`Removed parent from ${dto.slug}`);
    } else if (!isNew) {
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

    // 6) Attach tags
    cat.tags = tagEntities;

    // 7) Save
    await this.catRepo.save(cat);
    this.logger.log(`Category synced locally: ${cat.uuid} (${cat.slug})`);
  }

  // ---------------------------------------------------------
  // Fallback: pull from CMS service (cron calls this)
  // ---------------------------------------------------------
  public async fallbackSyncFromCms(): Promise<void> {
    const base = this.baseCmsUrl();
    const PAGE_SIZE = 100;
    let page = 1;
    let total = 0;
    let hasNextPage = true;

    while (hasNextPage) {
      const url = `${base}/api/categories?depth=2&limit=${PAGE_SIZE}&page=${page}`;
      const res = await this.http.axiosRef.get(url, { headers: this.authHeader(), timeout: 30000 });

      const list = Array.isArray(res.data?.docs) ? res.data.docs : [];

      for (const raw of list) {
        const dto = this.transformCmsCategory(raw);
        await this.syncFromCms(dto);
      }

      total += list.length;
      hasNextPage = res.data?.hasNextPage ?? false;
      page++;

      if (page > 500) {
        this.logger.warn('Fallback sync hit 500-page safety limit — some categories may not be synced');
        break;
      }
    }

    this.logger.log(`Fallback pulled ${total} categories from CMS`);
  }


  // ---------------------------------------------------------
  // Queries
  // ---------------------------------------------------------
  async findBySlug(slug: string): Promise<CategoryEntity> {
    const cat = await this.catRepo.findOne({
      where: { slug },
      relations: ['parent', 'tags'],
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
   * Prevent self-parent and cycles when assigning parent.
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
   * Dry-run before delete — no DB changes.
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
    if (checkProfanity(cleanName)) throw new BadRequestException('Invalid subcategory: Profanity');
    if (checkDrugs(cleanName)) throw new BadRequestException('Invalid subcategory: Drugs');
    if (checkTobacco(cleanName)) throw new BadRequestException('Invalid subcategory: Tobacco');
    if (checkPorn(cleanName)) throw new BadRequestException('Invalid subcategory: Pornography');
    if (checkGambling(cleanName)) throw new BadRequestException('Invalid subcategory: Gambling');

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

    await this.pushCategoryToCms({
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
    let displayName = name.trim();
    if (parentUuid?.trim()) {
      if (checkProfanity(displayName)) throw new BadRequestException('Invalid subcategory: Profanity');
      if (checkDrugs(displayName)) throw new BadRequestException('Invalid subcategory: Drugs');
      if (checkTobacco(displayName)) throw new BadRequestException('Invalid subcategory: Tobacco');
      if (checkPorn(displayName)) throw new BadRequestException('Invalid subcategory: Pornography');
      if (checkGambling(displayName)) throw new BadRequestException('Invalid subcategory: Gambling');
      parent = await this.catRepo.findOne({ where: { uuid: parentUuid } });
      if (!parent) {
        throw new BadRequestException(`Parent category not found locally for uuid=${parentUuid}`);
      }
    } else {
      const validation = await validateSubcategory(name, this.catRepo);
      if (!validation.valid) {
        throw new BadRequestException(`Invalid subcategory: ${validation.reason}`);
      }
      displayName = validation.name;
      parent = validation.parent;
    }

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

    await this.pushCategoryToCms({
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

    let targetUuid = reassignToUuid ?? cat.parent?.uuid ?? null;
    if (!targetUuid && hasChildren) {
      targetUuid = process.env.FALLBACK_PARENT_UUID || null;
    }

    if (targetUuid) {
      await this.contentService.reassignCategory(uuid, targetUuid);
    }

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

    await this.catRepo.delete({ uuid });

    this.logger.log(`Deleted category ${uuid}${targetUuid ? ` -> reassigned to ${targetUuid}` : ''}`);
    return { status: 'deleted' };
  }

  /** Reassign all direct children of `parentUuid` to `newParentUuid` */
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

  /** CMS webhook handler (Entry delete) — idempotent */
  async handleCmsDeleteWebhook(payload: any): Promise<{ status: string; reason?: string }> {
    const uuid = this.extractUuidFromWebhook(payload);
    if (!uuid) {
      this.logger.warn(`CMS delete webhook missing uuid. Payload keys: ${Object.keys(payload || {})}`);
      return { status: 'ignored', reason: 'no-uuid' };
    }
    try {
      await this.deleteCategory(uuid);
      this.logger.log(`Deleted via CMS webhook: ${uuid}`);
      return { status: 'ok' };
    } catch (e: any) {
      if (typeof e?.message === 'string' && e.message.includes('Category not found')) {
        this.logger.warn(`Delete via webhook ignored (already deleted): ${uuid}`);
        return { status: 'ignored', reason: 'already-deleted' };
      }
      this.logger.error(`Delete via webhook failed for ${uuid}: ${e?.message || e}`);
      return { status: 'error', reason: e?.message || 'delete-failed' };
    }
  }


  /** Try multiple payload shapes — always prefer uuid field */
  private extractUuidFromWebhook(body: any): string | null {
    const data = body?.data ?? body?.entry ?? body;
    const attrs = data?.attributes ?? data;
    return attrs?.uuid ?? data?.uuid ?? null;
  }

  // ---------------------------------------------------------
  // CMS helpers
  // ---------------------------------------------------------
  private baseCmsUrl(): string {
    return (process.env.CMS_SERVICE_URL || 'http://localhost:3020').replace(/\/+$/, '');
  }

  private cmsApiKey(): string | undefined {
    return process.env.CMS_API_KEY?.trim() || undefined;
  }

  private authHeader() {
    const key = this.cmsApiKey();
    if (!key) return {};
    return { Authorization: `API-Key ${key}` };
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

  private async findCmsCategoryBySlug(slug: string): Promise<any | null> {
    const url = `${this.baseCmsUrl()}/api/categories?where[slug][equals]=${encodeURIComponent(slug)}&limit=1`;
    const res = await this.http.axiosRef.get(url, { headers: this.authHeader() });
    const docs = res.data?.docs ?? [];
    return docs.length ? docs[0] : null;
  }

  /**
   * Push a category from Nest DB to CMS service (Payload CMS).
   * Uses Payload REST API: POST /api/categories or PATCH /api/categories/:id
   */
  public async pushCategoryToCms(cat: CategoryEntity): Promise<{ id: number | string }> {
    let parentId: number | string | null = null;

    if (cat.parent?.uuid) {
      const parentDoc = await this.findCmsCategoryBySlug(cat.parent.slug);
      if (parentDoc) {
        parentId = parentDoc.id;
      } else {
        const parentLocal = await this.catRepo.findOne({
          where: { uuid: cat.parent.uuid },
          relations: ['parent', 'tags'],
        });
        if (parentLocal) {
          await this.pushCategoryToCms(parentLocal);
          const pushed = await this.findCmsCategoryBySlug(cat.parent.slug);
          parentId = pushed?.id ?? null;
        }
      }
    }

    // Check if category already exists in CMS
    const existing = await this.findCmsCategoryBySlug(cat.slug);

    const payload = {
      uuid: cat.uuid,
      name: cat.name,
      slug: cat.slug,
      status: cat.published_in_marketplace ? 'active' : 'inactive',
      description: cat.seo_meta_description ?? '',
      ...(parentId ? { parent: parentId } : { parent: null }),
    };

    if (existing) {
      const url = `${this.baseCmsUrl()}/api/categories/${existing.id}`;
      const res = await this.http.axiosRef.patch(url, payload, { headers: this.authHeader() });
      this.logger.log(`Updated CMS category #${existing.id} from Nest`);
      return { id: res.data?.doc?.id ?? res.data?.id ?? existing.id };
    } else {
      const url = `${this.baseCmsUrl()}/api/categories`;
      const res = await this.http.axiosRef.post(url, payload, { headers: this.authHeader() });
      const id = res.data?.doc?.id ?? res.data?.id;
      this.logger.log(`Created CMS category #${id} from Nest`);
      return { id };
    }
  }

  /** Payload CMS REST -> CategoryDto */
  private transformCmsCategory(raw: any): CategoryDto {
    // Payload CMS returns flat objects
    let parentUuid = null;

    if (raw.parent) {
      if (typeof raw.parent === 'object' && raw.parent.uuid) {
        parentUuid = raw.parent.uuid;
      } else if (typeof raw.parent === 'string') {
        parentUuid = raw.parent;
      }
    }

    this.logger.debug(`Transform: ${raw.slug} -> parent=${parentUuid || 'null'}`);

    return {
      uuid: raw.uuid,
      name: raw.name,
      slug: raw.slug,
      approved: raw.status === 'active',
      published_in_marketplace: raw.status === 'active',
      parent: parentUuid,
      tags: (raw.tags ?? []).map((t: any) => {
        const tagData = typeof t === 'object' ? t : { slug: t };
        return {
          name: tagData?.name ?? tagData?.slug,
          slug: tagData?.slug,
          uuid: tagData?.uuid,
        };
      }),
      seo_meta_title: raw.seo_meta_title ?? null,
      seo_meta_description: raw.description ?? raw.seo_meta_description ?? null,
    };
  }

  /** Convenience: create a dummy local category then push it to CMS */
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

    const full = await this.catRepo.findOne({
      where: { id: saved.id },
      relations: ['parent'],
    });

    await this.pushCategoryToCms(full!);
    return full!;
  }

  async testCmsConnection() {
    try {
      const base = this.baseCmsUrl();
      const url = `${base}/api/categories?depth=1&limit=10`;

      this.logger.log(`Testing CMS connection: ${url}`);

      const res = await this.http.axiosRef.get(url, {
        headers: this.authHeader()
      });

      const docs = res.data?.docs ?? res.data?.data ?? [];
      this.logger.log(`CMS connected! Got ${docs.length} categories`);

      return {
        success: true,
        totalCategories: res.data?.totalDocs ?? docs.length,
        hasApiKey: !!this.cmsApiKey(),
        cmsUrl: base,
      };
    } catch (error) {
      const detail = this.formatHttpError(error);
      this.logger.error(`CMS connection failed: ${detail}`);
      return {
        success: false,
        error: detail,
        hasApiKey: !!this.cmsApiKey(),
        cmsUrl: this.baseCmsUrl(),
      };
    }
  }

}

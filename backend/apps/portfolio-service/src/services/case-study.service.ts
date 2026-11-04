import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CaseStudy } from '../entities/case-study.entity';
import { CaseStudyBlock, CaseStudyBlockType } from '../entities/case-study-block.entity';
import { CaseStudyLike } from '../entities/case-study-like.entity';
import { CreateCaseStudyDto, UpdateCaseStudyDto, PublishCaseStudyDto } from '../dto/case-study.dto';
import { SlugService } from './slug.service';
import { MediaService } from '../media/media.service';
import { validateSchemaJson } from '../util/case-study-schema.validator';
import { extractKeysFromSchemaJson } from '../media/media.cleanup';
import { compileToHtml } from '../util/case-study-html-renderer';
import { CaseStudyEventPublisher } from '../events/case-study-event-publisher.service';

interface ListOptions {
  status?: 'draft' | 'published' | 'hidden' | 'archived' | 'all';
  limit?: number;
  offset?: number;
}

@Injectable()
export class CaseStudyService {
  private readonly logger = new Logger(CaseStudyService.name);

  constructor(
    @InjectRepository(CaseStudy)
    private readonly caseStudies: Repository<CaseStudy>,
    @InjectRepository(CaseStudyBlock)
    private readonly blocks: Repository<CaseStudyBlock>,
    @InjectRepository(CaseStudyLike)
    private readonly likes: Repository<CaseStudyLike>,
    private readonly dataSource: DataSource,
    private readonly slugService: SlugService,
    private readonly mediaService: MediaService,
    private readonly events: CaseStudyEventPublisher,
  ) {}

  async create(dto: CreateCaseStudyDto, ownerUserId: string): Promise<CaseStudy> {
    const slug = await this.slugService.generateUniqueSlug(dto.title);
    const cs = this.caseStudies.create({
      ownerUserId,
      title: dto.title,
      slug,
      status: 'draft',
    });
    const saved = await this.caseStudies.save(cs);
    this.logger.log(`Case study created: ${saved.id} (owner ${ownerUserId})`);
    await this.events.publishCreated(saved);
    return saved;
  }

  async getById(id: string, ownerUserId: string): Promise<CaseStudy> {
    return this.validateOwnership(id, ownerUserId);
  }

  /** Current like state for one viewer — what the heart renders on open. */
  async getLikeState(
    id: string,
    userId: string,
  ): Promise<{ liked: boolean; likesCount: number }> {
    const cs = await this.caseStudies.findOne({
      where: { id },
      select: { id: true, likesCount: true },
    });
    if (!cs) {
      throw new NotFoundException('Case study not found');
    }
    const liked = await this.likes.exist({
      where: { caseStudyId: id, userId },
    });
    return { liked, likesCount: cs.likesCount };
  }

  /**
   * Likes the case study for this viewer, or removes their like if they
   * already had one.
   *
   * Everything runs in one transaction, and the stored total is recomputed
   * from `case_study_likes` rather than incremented, so a double-submit or
   * two concurrent clicks can't push the count away from the real number of
   * rows. The insert races on the table's unique constraint rather than on
   * a read-then-write check: a duplicate is caught and treated as "already
   * liked", which is the state the caller asked for anyway.
   */
  async toggleLike(
    id: string,
    userId: string,
  ): Promise<{ liked: boolean; likesCount: number }> {
    return this.dataSource.transaction(async (manager) => {
      const csRepo = manager.getRepository(CaseStudy);
      const likeRepo = manager.getRepository(CaseStudyLike);

      // Locked for the whole toggle, because the recount below has to see
      // every committed like. Under READ COMMITTED two concurrent likes from
      // different users would each see only their own insert, both count 1,
      // and both write that same too-low total — leaving likesCount short of
      // the real number of rows. The lock serializes toggles per case study.
      const cs = await csRepo.findOne({
        where: { id },
        select: { id: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!cs) {
        throw new NotFoundException('Case study not found');
      }

      const removed = await likeRepo.delete({ caseStudyId: id, userId });
      const liked = removed.affected === 0;
      if (liked) {
        await likeRepo
          .createQueryBuilder()
          .insert()
          .values({ caseStudyId: id, userId })
          // Concurrent first-likes from the same viewer: one wins, the other
          // is a no-op, and both end up reporting liked=true.
          .orIgnore()
          .execute();
      }

      const likesCount = await likeRepo.count({ where: { caseStudyId: id } });
      await csRepo.update({ id }, { likesCount });

      this.logger.debug(
        `Case study ${id} ${liked ? 'liked' : 'unliked'} by ${userId} (total ${likesCount})`,
      );
      return { liked, likesCount };
    });
  }

  async updateDraft(id: string, ownerUserId: string, dto: UpdateCaseStudyDto): Promise<CaseStudy> {
    const cs = await this.validateOwnership(id, ownerUserId);

    if (dto.title !== undefined) {
      cs.title = dto.title;
    }

    if (dto.description !== undefined) {
      cs.description = dto.description;
    }

    if (dto.schemaJson !== undefined) {
      validateSchemaJson(dto.schemaJson);
      cs.schemaJson = dto.schemaJson;
      await this.syncBlocksFromSchema(cs.id, dto.schemaJson);
    }

    const saved = await this.caseStudies.save(cs);
    this.logger.debug(`Draft saved: ${saved.id}`);
    await this.events.publishDraftSaved(saved);
    return saved;
  }

  async reorderBlocks(id: string, ownerUserId: string, blockOrder: string[]): Promise<CaseStudy> {
    const cs = await this.validateOwnership(id, ownerUserId);

    const existingBlocks = await this.blocks.find({ where: { caseStudyId: id } });
    const existingIds = new Set(existingBlocks.map((b) => b.id));
    const orderedIds = new Set(blockOrder);

    const sameSet =
      blockOrder.length === existingBlocks.length &&
      orderedIds.size === existingIds.size &&
      [...existingIds].every((existingId) => orderedIds.has(existingId));

    if (!sameSet) {
      throw new BadRequestException('blockOrder must contain exactly this case study\'s existing block IDs');
    }

    const blocksById = new Map(existingBlocks.map((b) => [b.id, b]));

    await this.blocks.manager.transaction(async (manager) => {
      for (let i = 0; i < blockOrder.length; i++) {
        await manager.update(CaseStudyBlock, { id: blockOrder[i], caseStudyId: id }, { position: i });
      }
    });

    // Keep schemaJson.blocks in sync with the new order so a subsequent GET reflects it too.
    const reorderedSchemaBlocks = blockOrder.map((blockId) => {
      const block = blocksById.get(blockId)!;
      return { type: block.blockType, data: block.contentJson };
    });
    cs.schemaJson = { ...(cs.schemaJson as Record<string, any>), blocks: reorderedSchemaBlocks };

    const saved = await this.caseStudies.save(cs);
    this.logger.debug(`Blocks reordered: ${id}`);
    return saved;
  }

  async delete(id: string, ownerUserId: string): Promise<void> {
    const cs = await this.validateOwnership(id, ownerUserId);

    const publicBase = process.env.CLOUDFLARE_PUBLIC_URL || '';
    const keys = extractKeysFromSchemaJson(cs.schemaJson, publicBase);
    for (const key of keys) {
      try {
        await this.mediaService.deleteFile(key);
      } catch (err) {
        this.logger.warn(`Failed to delete media key ${key}: ${err}`);
      }
    }

    await this.caseStudies.remove(cs);
    this.logger.log(`Case study deleted: ${id}`);
    await this.events.publishDeleted(id, ownerUserId);
  }

  async publishCaseStudy(id: string, ownerUserId: string, dto: PublishCaseStudyDto = {}): Promise<CaseStudy> {
    const cs = await this.validateOwnership(id, ownerUserId);

    if (cs.status === 'archived') {
      throw new ConflictException('Cannot publish an archived case study');
    }

    const blockCount = (cs.schemaJson as any)?.blocks?.length ?? 0;
    if (!cs.title?.trim() || blockCount === 0) {
      throw new BadRequestException('Title and at least one block are required to publish');
    }

    // Re-check slug uniqueness at publish time (create-time generation already enforces this,
    // but titles/slugs can be edited independently while in draft).
    const uniqueSlug = await this.slugService.enforceUnique(cs.slug, cs.id);
    if (uniqueSlug !== cs.slug) {
      cs.slug = uniqueSlug;
    }

    if (dto.coverImage !== undefined) {
      cs.coverImage = dto.coverImage;
    }
    if (dto.coverImageZoom !== undefined) {
      cs.coverImageZoom = dto.coverImageZoom;
    }
    if (dto.coverImageRotation !== undefined) {
      cs.coverImageRotation = dto.coverImageRotation;
    }
    if (dto.coverImageOffsetX !== undefined) {
      cs.coverImageOffsetX = dto.coverImageOffsetX;
    }
    if (dto.coverImageOffsetY !== undefined) {
      cs.coverImageOffsetY = dto.coverImageOffsetY;
    }
    if (dto.skills !== undefined) {
      cs.skills = dto.skills;
    }

    cs.htmlPublished = compileToHtml(cs.schemaJson);
    cs.status = 'published';

    const saved = await this.caseStudies.save(cs);
    this.logger.log(`Case study published: ${saved.id} (slug ${saved.slug})`);
    await this.events.publishPublished(saved);
    return saved;
  }

  /** Toggles a published case study out of public view (and back). Draft/archived
   *  case studies aren't valid inputs — only a published <-> hidden flip is allowed. */
  async setVisibility(id: string, ownerUserId: string, status: 'published' | 'hidden'): Promise<CaseStudy> {
    const cs = await this.validateOwnership(id, ownerUserId);

    if (cs.status !== 'published' && cs.status !== 'hidden') {
      throw new ConflictException(`Cannot change visibility of a ${cs.status} case study`);
    }

    cs.status = status;
    const saved = await this.caseStudies.save(cs);
    this.logger.debug(`Case study visibility set: ${id} -> ${status}`);
    return saved;
  }

  async getPublicBySlug(slug: string): Promise<CaseStudy> {
    const cs = await this.caseStudies.findOne({ where: { slug, status: 'published' } });
    if (!cs) {
      throw new NotFoundException('Case study not found');
    }
    return cs;
  }

  /** Published-only read by id, for viewers who don't own the case study. */
  async getPublicById(id: string): Promise<CaseStudy> {
    const cs = await this.caseStudies.findOne({ where: { id, status: 'published' } });
    if (!cs) {
      throw new NotFoundException('Case study not found');
    }
    return cs;
  }

  /**
   * One talent's published case studies, for their public profile. Ordered
   * the same way the owner's own grid is, so the visitor sees the cards in
   * the order the talent does.
   */
  async listPublishedByOwner(
    ownerUserId: string,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<{ items: CaseStudy[]; total: number }> {
    const { limit = 20, offset = 0 } = opts;
    const [items, total] = await this.caseStudies.findAndCount({
      where: { ownerUserId, status: 'published' },
      order: { updatedAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }

  async listByOwner(ownerUserId: string, opts: ListOptions = {}): Promise<{ items: CaseStudy[]; total: number }> {
    const { status, limit = 20, offset = 0 } = opts;

    const where: Record<string, any> = { ownerUserId };
    if (status && status !== 'all') {
      where.status = status;
    }

    const [items, total] = await this.caseStudies.findAndCount({
      where,
      order: { updatedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { items, total };
  }

  private async syncBlocksFromSchema(caseStudyId: string, schema: Record<string, any>): Promise<void> {
    const blocks = (schema.blocks || []) as Array<{ type: string; data: Record<string, any> }>;

    await this.blocks.manager.transaction(async (manager) => {
      await manager.delete(CaseStudyBlock, { caseStudyId });
      if (blocks.length === 0) return;

      const rows = blocks.map((block, index) =>
        manager.create(CaseStudyBlock, {
          caseStudyId,
          blockType: block.type as CaseStudyBlockType,
          position: index,
          contentJson: block.data,
        }),
      );
      await manager.save(CaseStudyBlock, rows);
    });
  }

  private async validateOwnership(id: string, ownerUserId: string): Promise<CaseStudy> {
    const cs = await this.caseStudies.findOne({ where: { id } });
    if (!cs) {
      throw new NotFoundException('Case study not found');
    }
    if (cs.ownerUserId.toLowerCase() !== ownerUserId.toLowerCase()) {
      throw new ForbiddenException("You don't have permission to access this case study");
    }
    return cs;
  }
}

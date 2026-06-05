import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Screenshot } from './screenshots.entity';
import { AdminSettings } from '../entities/admin-settings.entity';
import { R2Service } from '../storage/r2.service';
import { ConfirmScreenshotDto } from './dto/confirm.dto';
import { CreateFlagDto } from './dto/create-flag.dto';
import { ReviewScreenshotDto } from './dto/review-screenshot.dto';
import { ScreenshotQueryDto } from '../dtos/screenshot-query.dto';
import { EarningsSyncService } from '../services/earnings-sync.service';
import {
  BatchUpdateScreenshotDto,
  DeleteScreenshotDto,
  UpdateScreenshotMetaDto,
} from '../dtos/update-screenshot.dto';

@Injectable()
export class ScreenshotsService {
  constructor(
    @InjectRepository(Screenshot)
    private readonly repo: Repository<Screenshot>,
    @InjectRepository(AdminSettings)
    private readonly settingsRepo: Repository<AdminSettings>,
    private readonly r2: R2Service,
    private readonly earningsSync: EarningsSyncService,
  ) {}


  async confirm(dto: ConfirmScreenshotDto): Promise<Screenshot> {
    const keyboard = dto.keyboard ?? 0;
    const mouse = dto.mouse ?? 0;
    // keyboard and mouse values from the desktop are already activity percentages (0-100)
    const keyboardPct = keyboard;
    const mousePct = mouse;

    // Save image locally if base64 data is provided
    let url: string | null = null;
    if ((dto as any).imageBase64) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const uploadsDir = path.join(process.cwd(), 'screenshot-uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filename = dto.key.replace('screenshots/', '');
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, Buffer.from((dto as any).imageBase64, 'base64'));
        const port = process.env.PORT ?? 3017;
        url = `http://localhost:${port}/api/screenshot-files/${filename}`;
      } catch (err) {
        // Non-fatal — screenshot metadata still saves
      }
    }

    const saved = await this.repo.save({
      userId: dto.userId,
      key: dto.key,
      mimeType: dto.mimeType,
      bytes: dto.bytes,
      capturedAt: dto.timestamp ? new Date(dto.timestamp) : null,
      contractId: dto.contractId ?? null,
      taskId: dto.taskId ?? null,
      keyboard,
      mouse,
      keyboardPct,
      mousePct,
      monitorId: dto.monitorId ?? null,
      groupKey: dto.groupKey ?? null,
      isDeleted: false,
      url: url ?? undefined,
      apps: dto.apps ?? null,
    } as any);
    // Sync to earnings_cache (non-blocking)
    if (saved.contractId && saved.capturedAt) {
      this.earningsSync.syncScreenshot({
        userId: saved.userId,
        contractId: saved.contractId,
        taskId: saved.taskId ?? null,
        capturedAt: new Date(saved.capturedAt),
      }).catch(e => console.error('EarningsSync error:', e));
    }
    return saved;
  }

  async listByUser(userId: string, page = 1, limit = 50) {
    const take = Math.min(200, Math.max(1, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * take;

    const items = await this.repo.find({
      where: { userId, isDeleted: false },
      order: { createdAt: 'DESC' as const },
      skip,
      take,
    });

    let total: number;
    try {
      total = await (this.repo as any).count({ where: { userId, isDeleted: false } });
    } catch {
      total = (await this.repo.find({ where: { userId, isDeleted: false } })).length;
    }

    return { items, page: Number(page), limit: take, total };
  }

  /** Soft-delete (idempotent, owner-only) using raw SQL — bypasses TypeORM column mapping quirks */
  async deleteScreenshot(
    id: string,
    userId: string,
    role: string,
    dto: DeleteScreenshotDto = {},
    scopeId?: string,
  ) {
    if (role !== 'admin' && scopeId) {
      const settings = await this.getSettings(scopeId);
      if (!settings.allowDelete) {
        throw new ForbiddenException('Screenshot deletion is not allowed by admin settings');
      }
    }

    const reason = dto.reason ?? null;
    const now = new Date().toISOString();

    const updated = await (this.repo as any).query(
      `UPDATE time_tracking.screenshots
       SET is_deleted = true, deleted_at = $3, deletion_reason = $4
       WHERE id = $1 AND user_id = $2 AND is_deleted = false
       RETURNING id`,
      [id, userId, now, reason],
    );

    if (Array.isArray(updated) && updated.length > 0) {
      return { id, isDeleted: true };
    }

    // Check if not found or not owner
    const rows = await (this.repo as any).query(
      `SELECT id, user_id FROM time_tracking.screenshots WHERE id = $1`,
      [id],
    );

    if (!Array.isArray(rows) || rows.length === 0) throw new NotFoundException('Screenshot not found');
    if (String(rows[0].user_id) !== String(userId)) {
      throw new ForbiddenException('Not authorized to delete this screenshot');
    }

    // Already deleted — idempotent
    return { id, isDeleted: true };
  }

  // ── Cards (paginated, filtered, sorted) ────────────────────────────

  async findCards(
    userId: string | null,
    query: ScreenshotQueryDto,
  ): Promise<{ data: Array<Screenshot & { thumbnailUrl: string }>; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('"from" must be before "to"');
    }

    const qb = this.repo.createQueryBuilder('s').where('s.isDeleted = false');
    if (userId) qb.andWhere('s.userId = :userId', { userId });
    if (query.contractId) qb.andWhere('s.contractId = :contractId', { contractId: query.contractId });
    if (query.taskId) qb.andWhere('s.taskId = :taskId', { taskId: query.taskId });
    if (query.from) qb.andWhere('s.createdAt >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('s.createdAt <= :to', { to: new Date(query.to) });
    if (query.minKeyboard !== undefined) qb.andWhere('s.keyboard >= :minKeyboard', { minKeyboard: query.minKeyboard });
    if (query.maxKeyboard !== undefined) qb.andWhere('s.keyboard <= :maxKeyboard', { maxKeyboard: query.maxKeyboard });
    if (query.minMouse !== undefined) qb.andWhere('s.mouse >= :minMouse', { minMouse: query.minMouse });
    if (query.maxMouse !== undefined) qb.andWhere('s.mouse <= :maxMouse', { maxMouse: query.maxMouse });

    const sortField = {
      timestamp: 's.createdAt',
      keyboard: 's.keyboard',
      mouse: 's.mouse',
      project: 's.contractId',
    }[query.sortBy ?? 'timestamp'] ?? 's.createdAt';

    qb.orderBy(sortField, query.sortOrder ?? 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

  

    const [rows, total] = await qb.getManyAndCount();

    
    // Contract names resolved by frontend via contract picker — no cross-schema query
    const contractNameMap = new Map<string, string>();

    // Resolve task names from time_tracking.contract_tasks table
    const taskIds = [...new Set(rows.map(s => s.taskId).filter(Boolean))];
    const taskNameMap = new Map<string, string>();
    if (taskIds.length > 0) {
      try {
        const taskRows: Array<{ id: string; name: string }> = await this.repo.query(
          `SELECT id, name FROM time_tracking.contract_tasks WHERE id = ANY($1)`,
          [taskIds],
        );
        for (const t of taskRows) {
          taskNameMap.set(t.id, t.name);
        }
      } catch {
        // Non-fatal
      }
    }

    const data = await Promise.all(
      rows.map(async (s) => {
        let thumbnailUrl = s.url || '';
        if (!thumbnailUrl) {
          try {
            const result = await this.r2.presignGet(s.key);
            thumbnailUrl = result.url;
          } catch {
            thumbnailUrl = '';
          }
        }
        const contractName = s.contractId ? (contractNameMap.get(s.contractId) ?? null) : null;
        const taskName = s.taskId ? (taskNameMap.get(s.taskId) ?? null) : null;
        return { ...s, thumbnailUrl, contractName, taskName };
      }),
    );

    return { data, total, page, pageSize };
  }

  async findDetail(id: string, userId: string, role: string): Promise<Screenshot & { signedUrl: string }> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    if (role !== 'admin' && screenshot.userId !== userId) throw new ForbiddenException('Access denied');

    const signedUrl = await this.buildSignedUrl(screenshot);
    return { ...screenshot, signedUrl };
  }

  async findGrouped(groupKey: string, userId: string, role: string): Promise<Screenshot[]> {
    const screenshots = await this.repo.find({
      where: { groupKey, isDeleted: false },
      order: { monitorId: 'ASC' },
    });
    if (screenshots.length && role !== 'admin' && screenshots[0].userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return screenshots;
  }

  // ── Full list with filters + sort ──────────────────────────────────

  async listScreenshots(
    query: ScreenshotQueryDto,
    userId: string,
    role: string,
  ): Promise<Array<Screenshot & { signedUrl: string }>> {
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('"from" must be before "to"');
    }

    const qb = this.repo.createQueryBuilder('s').where('s.isDeleted = false');

    if (role !== 'admin') {
      qb.andWhere('s.userId = :userId', { userId });
    }

    // timeEntryType=manual → screenshots endpoint returns empty
    if (query.timeEntryType === 'manual') {
      return [];
    }

    if (query.contractId) qb.andWhere('s.contractId = :p', { p: query.contractId });
    if (query.taskId) qb.andWhere('s.taskId = :t', { t: query.taskId });

    if (query.from && query.to) {
      qb.andWhere('s.capturedAt BETWEEN :f AND :to', { f: new Date(query.from), to: new Date(query.to) });
    } else if (query.from) {
      qb.andWhere('s.capturedAt >= :f', { f: new Date(query.from) });
    } else if (query.to) {
      qb.andWhere('s.capturedAt <= :to', { to: new Date(query.to) });
    }

    if (query.apps?.length) {
      qb.andWhere(
        new Brackets((sub) => {
          query.apps!.forEach((name, idx) => {
            sub[idx === 0 ? 'where' : 'orWhere'](
              `EXISTS (SELECT 1 FROM jsonb_array_elements(s.apps) a WHERE a->>'appName' ILIKE :app${idx})`,
              { [`app${idx}`]: name },
            );
          });
        }),
      );
    }

    if (query.urlContains) {
      qb.andWhere('s.url ILIKE :urlLike', { urlLike: `%${query.urlContains}%` });
    }

    if (typeof query.activityLevel === 'number') {
      qb.andWhere('((s.keyboard + s.mouse) / 2) >= :lvl', { lvl: query.activityLevel });
    }

    const sortField = {
      timestamp: 's.capturedAt',
      keyboard: 's.keyboard',
      mouse: 's.mouse',
      project: 's.contractId',
    }[query.sortBy ?? 'timestamp'] ?? 's.capturedAt';

    qb.orderBy(sortField, query.sortOrder ?? 'DESC');

    const rows = await qb.getMany();

    return Promise.all(
      rows.map(async (s) => {
        const signedUrl = await this.buildSignedUrl(s);
        return { ...s, signedUrl };
      }),
    );
  }

  // ── Signed URL (blur-aware) ────────────────────────────────────────

  async getSignedUrl(id: string, userId: string, role: string): Promise<{ signedUrl: string }> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    if (role !== 'admin' && screenshot.userId !== userId) throw new ForbiddenException('Access denied');

    const signedUrl = await this.buildSignedUrl(screenshot);
    return { signedUrl };
  }

  // ── Meta updates ───────────────────────────────────────────────────

  async updateMeta(
    id: string,
    userId: string,
    role: string,
    dto: UpdateScreenshotMetaDto,
    scopeId?: string,
  ): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    if (role !== 'admin' && screenshot.userId !== userId) throw new ForbiddenException('Access denied');

    if (role !== 'admin' && scopeId) {
      const settings = await this.getSettings(scopeId);
      if (!settings.allowReassign) throw new ForbiddenException('Reassigning project/task is not allowed by admin settings');
    }

    if (dto.contractId !== undefined) screenshot.contractId = dto.contractId;
    if (dto.taskId !== undefined) screenshot.taskId = dto.taskId;
    return this.repo.save(screenshot);
  }

  async batchUpdateMeta(
    userId: string,
    role: string,
    dto: BatchUpdateScreenshotDto,
    scopeId?: string,
  ): Promise<{ updated: number }> {
    if (role !== 'admin' && scopeId) {
      const settings = await this.getSettings(scopeId);
      if (!settings.allowReassign) throw new ForbiddenException('Reassigning project/task is not allowed by admin settings');
    }

    const updates: Partial<Screenshot> = {};
    if (dto.contractId !== undefined) updates.contractId = dto.contractId;
    if (dto.taskId !== undefined) updates.taskId = dto.taskId;

    const qb = this.repo.createQueryBuilder()
      .update(Screenshot)
      .set(updates)
      .whereInIds(dto.ids);

    if (role !== 'admin') qb.andWhere('"user_id" = :userId', { userId });

    const result = await qb.execute();
    return { updated: result.affected ?? 0 };
  }

  // ── Blur ───────────────────────────────────────────────────────────

  async blur(id: string, userId: string, role: string, scopeId?: string): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    if (role !== 'admin' && screenshot.userId !== userId) throw new ForbiddenException('Access denied');

    const settings = scopeId ? await this.getSettings(scopeId) : null;
    if (settings && !settings.allowBlur) throw new ForbiddenException('Blurring is not allowed by admin settings');

    screenshot.isBlurred = true;
    screenshot.blurredAt = new Date();
    screenshot.reviewStatus = settings?.autoApproveBlur || role === 'admin' ? 'approved' : 'pending';

    return this.repo.save(screenshot);
  }

  async unblur(id: string, userId: string): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    if (screenshot.userId !== userId) throw new ForbiddenException('Access denied');
    screenshot.isBlurred = false;
    screenshot.blurredAt = null as any;
    return this.repo.save(screenshot);
  }

  // ── Moderation: Flag ───────────────────────────────────────────────

  async flagScreenshot(id: string, userId: string, role: string, dto: CreateFlagDto): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    if (role !== 'admin' && screenshot.userId !== userId) throw new ForbiddenException('Access denied');

    screenshot.isFlagged = true;
    screenshot.flaggedBy = userId;
    screenshot.flaggedAt = new Date();
    if (!screenshot.reviewStatus) {
      screenshot.reviewStatus = 'pending';
    }

    return this.repo.save(screenshot);
  }

  async getFlaggedScreenshots(page = 1, pageSize = 50): Promise<Screenshot[]> {
    return this.repo.find({
      where: { isFlagged: true, isDeleted: false },
      order: { flaggedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async reviewScreenshot(id: string, adminId: string, dto: ReviewScreenshotDto): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id });
    if (!screenshot) throw new NotFoundException('Screenshot not found');

    screenshot.reviewStatus = dto.status;
    screenshot.reviewedBy = adminId;
    screenshot.reviewComment = dto.comment ?? null;

    return this.repo.save(screenshot);
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private async buildSignedUrl(screenshot: Screenshot): Promise<string> {
    if (screenshot.isBlurred) {
      const cdnBase = process.env.R2_CDN_BASE ?? process.env.R2_PUBLIC_BASE;
      if (cdnBase) {
        return `${cdnBase}/blurred/${screenshot.key}`;
      }
    }
    const { url } = await this.r2.presignGet(screenshot.key);
    return url;
  }

  private async getSettings(scopeId: string): Promise<AdminSettings> {
    let settings = await this.settingsRepo.findOneBy({ scopeId });
    if (!settings) {
      settings = this.settingsRepo.create({ scopeId });
      await this.settingsRepo.save(settings);
    }
    return settings;
  }
}


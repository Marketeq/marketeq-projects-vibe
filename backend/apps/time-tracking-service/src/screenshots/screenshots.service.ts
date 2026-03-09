import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Screenshot } from './screenshots.entity';
import { AdminSettings } from '../entities/admin-settings.entity';
import { ConfirmScreenshotDto } from './dto/confirm.dto';
import { ScreenshotQueryDto } from '../dtos/screenshot-query.dto';
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
  ) {}

  // ── From original ──────────────────────────────────────────────────

  async confirm(dto: ConfirmScreenshotDto): Promise<Screenshot> {
    const keyboard = dto.keyboard ?? 0;
    const mouse = dto.mouse ?? 0;
    const activity = keyboard + mouse;
    const keyboardPct = activity > 0 ? Math.round((keyboard / activity) * 100) : null;
    const mousePct = activity > 0 ? Math.round((mouse / activity) * 100) : null;

    const saved = await this.repo.save({
      userId: dto.userId,
      key: dto.key,
      mimeType: dto.mimeType,
      bytes: dto.bytes,
      capturedAt: dto.timestamp ? new Date(dto.timestamp) : null,
      projectId: dto.projectId ?? null,
      taskId: dto.taskId ?? null,
      keyboard,
      mouse,
      keyboardPct,
      mousePct,
      monitorId: dto.monitorId ?? null,
      groupKey: dto.groupKey ?? null,
      isDeleted: false,
    } as any);
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
      `UPDATE public.screenshots
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
      `SELECT id, user_id FROM public.screenshots WHERE id = $1`,
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
  ): Promise<{ data: Screenshot[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.repo.createQueryBuilder('s').where('s.isDeleted = false');
    if (userId) qb.andWhere('s.userId = :userId', { userId });
    if (query.projectId) qb.andWhere('s.projectId = :projectId', { projectId: query.projectId });
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
      project: 's.projectId',
    }[query.sortBy ?? 'timestamp'] ?? 's.createdAt';

    qb.orderBy(sortField, query.sortOrder ?? 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, pageSize };
  }

  async findDetail(id: string, userId: string, role: string): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    if (role !== 'admin' && screenshot.userId !== userId) throw new ForbiddenException('Access denied');
    return screenshot;
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

    if (dto.projectId !== undefined) screenshot.projectId = dto.projectId;
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
    if (dto.projectId !== undefined) updates.projectId = dto.projectId;
    if (dto.taskId !== undefined) updates.taskId = dto.taskId;

    const qb = this.repo.createQueryBuilder()
      .update(Screenshot)
      .set(updates)
      .whereInIds(dto.ids);

    if (role !== 'admin') qb.andWhere('"userId" = :userId', { userId });

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

  // ── Helpers ────────────────────────────────────────────────────────

  private async getSettings(scopeId: string): Promise<AdminSettings> {
    let settings = await this.settingsRepo.findOneBy({ scopeId });
    if (!settings) {
      settings = this.settingsRepo.create({ scopeId });
      await this.settingsRepo.save(settings);
    }
    return settings;
  }
}

import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Screenshot } from '../entities/screenshot.entity';
import { AdminSettings } from '../entities/admin-settings.entity';
import { CreateScreenshotDto } from '../dtos/create-screenshot.dto';
import { ScreenshotQueryDto } from '../dtos/screenshot-query.dto';
import {
  BatchUpdateScreenshotDto,
  DeleteScreenshotDto,
  UpdateScreenshotMetaDto,
} from '../dtos/update-screenshot.dto';

@Injectable()
export class ScreenshotsService {
  private readonly logger = new Logger(ScreenshotsService.name);

  constructor(
    @InjectRepository(Screenshot)
    private readonly repo: Repository<Screenshot>,
    @InjectRepository(AdminSettings)
    private readonly settingsRepo: Repository<AdminSettings>,
  ) {}

  async create(dto: CreateScreenshotDto): Promise<Screenshot> {
    const activity = dto.keyboard + dto.mouse;
    const keyboardPct = activity > 0 ? Math.round((dto.keyboard / activity) * 100) : 0;
    const mousePct = activity > 0 ? Math.round((dto.mouse / activity) * 100) : 0;

    const screenshot = this.repo.create({
      userId: dto.userId,
      projectId: dto.projectId ?? null,
      taskId: dto.taskId ?? null,
      imageUrl: dto.imageUrl,
      timestamp: new Date(dto.timestamp),
      keyboard: dto.keyboard,
      mouse: dto.mouse,
      keyboardPct,
      mousePct,
      monitorId: dto.monitorId ?? null,
      groupKey: dto.groupKey ?? null,
      appUsage: dto.appUsage ?? null,
    });
    return this.repo.save(screenshot);
  }

  async adminFindCards(query: ScreenshotQueryDto): Promise<{ data: Screenshot[]; total: number; page: number; pageSize: number }> {
    return this.buildCardsQuery(null, query);
  }

  async findCards(userId: string, query: ScreenshotQueryDto): Promise<{ data: Screenshot[]; total: number; page: number; pageSize: number }> {
    return this.buildCardsQuery(userId, query);
  }

  private async buildCardsQuery(userId: string | null, query: ScreenshotQueryDto): Promise<{ data: Screenshot[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.repo.createQueryBuilder('s').where('s.isDeleted = false');

    if (userId) qb.andWhere('s.userId = :userId', { userId });

    if (query.projectId) qb.andWhere('s.projectId = :projectId', { projectId: query.projectId });
    if (query.taskId) qb.andWhere('s.taskId = :taskId', { taskId: query.taskId });
    if (query.from) qb.andWhere('s.timestamp >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('s.timestamp <= :to', { to: new Date(query.to) });
    if (query.minKeyboard !== undefined) qb.andWhere('s.keyboard >= :minKeyboard', { minKeyboard: query.minKeyboard });
    if (query.maxKeyboard !== undefined) qb.andWhere('s.keyboard <= :maxKeyboard', { maxKeyboard: query.maxKeyboard });
    if (query.minMouse !== undefined) qb.andWhere('s.mouse >= :minMouse', { minMouse: query.minMouse });
    if (query.maxMouse !== undefined) qb.andWhere('s.mouse <= :maxMouse', { maxMouse: query.maxMouse });

    const sortField = {
      timestamp: 's.timestamp',
      keyboard: 's.keyboard',
      mouse: 's.mouse',
      project: 's.projectId',
    }[query.sortBy ?? 'timestamp'] ?? 's.timestamp';

    qb.orderBy(sortField, query.sortOrder ?? 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, pageSize };
  }

  async findDetail(id: string, userId: string, role: string): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    if (role !== 'admin' && screenshot.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
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

  async updateMeta(id: string, userId: string, role: string, dto: UpdateScreenshotMetaDto, scopeId?: string): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    if (role !== 'admin' && screenshot.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (role !== 'admin' && scopeId) {
      const settings = await this.getSettings(scopeId);
      if (!settings.allowReassign) {
        throw new ForbiddenException('Reassigning project/task is not allowed by admin settings');
      }
    }

    if (dto.projectId !== undefined) screenshot.projectId = dto.projectId;
    if (dto.taskId !== undefined) screenshot.taskId = dto.taskId;
    return this.repo.save(screenshot);
  }

  async batchUpdateMeta(userId: string, role: string, dto: BatchUpdateScreenshotDto, scopeId?: string): Promise<{ updated: number }> {
    if (role !== 'admin' && scopeId) {
      const settings = await this.getSettings(scopeId);
      if (!settings.allowReassign) {
        throw new ForbiddenException('Reassigning project/task is not allowed by admin settings');
      }
    }

    const qb = this.repo.createQueryBuilder()
      .update(Screenshot)
      .whereInIds(dto.ids);

    if (role !== 'admin') qb.andWhere('userId = :userId', { userId });

    const updates: Partial<Screenshot> = {};
    if (dto.projectId !== undefined) updates.projectId = dto.projectId;
    if (dto.taskId !== undefined) updates.taskId = dto.taskId;
    qb.set(updates);

    const result = await qb.execute();
    return { updated: result.affected ?? 0 };
  }

  async softDelete(id: string, userId: string, role: string, dto: DeleteScreenshotDto, scopeId?: string): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    if (role !== 'admin' && screenshot.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (scopeId) {
      const settings = await this.getSettings(scopeId);
      if (!settings.allowDelete) {
        throw new ForbiddenException('Screenshot deletion is not allowed by admin settings');
      }
    }

    screenshot.isDeleted = true;
    screenshot.deletedAt = new Date();
    screenshot.deletionReason = dto.reason ?? null;
    return this.repo.save(screenshot);
  }

  async blur(id: string, userId: string, role: string, scopeId?: string): Promise<Screenshot> {
    const screenshot = await this.repo.findOneBy({ id, isDeleted: false });
    if (!screenshot) throw new NotFoundException('Screenshot not found');
    if (role !== 'admin' && screenshot.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const settings = scopeId ? await this.getSettings(scopeId) : null;
    if (settings && !settings.allowBlur) {
      throw new ForbiddenException('Blurring is not allowed by admin settings');
    }

    screenshot.isBlurred = true;
    screenshot.blurredAt = new Date();

    if (settings?.autoApproveBlur || role === 'admin') {
      screenshot.reviewStatus = 'approved';
    } else {
      screenshot.reviewStatus = 'pending';
    }

    return this.repo.save(screenshot);
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

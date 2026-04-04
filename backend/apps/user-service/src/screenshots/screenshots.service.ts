import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Screenshot } from './screenshot.entity';

type ListOpts = {
  limit?: number;
  app?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

@Injectable()
export class ScreenshotsService {
  constructor(@InjectRepository(Screenshot) private repo: Repository<Screenshot>) {}

  async list(userId: string, opts: ListOpts = {}) {
    const limit = Math.min(opts.limit ?? 50, 100);

    const qb = this.repo
      .createQueryBuilder('ss')
      .where('ss."userId" = :userId', { userId })
      .andWhere('ss.deleted = false')
      .orderBy('ss."takenAt"', 'DESC')
      .limit(limit);

    if (opts.app) {
      qb.andWhere(':app = ANY(ss."appsUsed")', { app: opts.app });
    }
    if (opts.dateFrom) {
      qb.andWhere('ss."takenAt" >= :dateFrom', { dateFrom: opts.dateFrom });
    }
    if (opts.dateTo) {
      qb.andWhere('ss."takenAt" < :dateTo', { dateTo: opts.dateTo });
    }

    return qb.getMany();
  }

  async blur(id: string, userId: string, blurred: boolean) {
    const ss = await this.repo.findOne({ where: { id, userId, deleted: false } });
    if (!ss) throw new NotFoundException('Screenshot not found');
    ss.blurred = blurred;
    return this.repo.save(ss);
  }

  async remove(id: string, userId: string, reason: string) {
    if (!reason || !reason.trim()) throw new BadRequestException('Reason is required');
    const ss = await this.repo.findOne({ where: { id, userId, deleted: false } });
    if (!ss) throw new NotFoundException('Screenshot not found');
    ss.deleted = true;
    await this.repo.save(ss);
    return { id: ss.id, deleted: true, reason };
  }

  async bulkAssign(
    userId: string,
    ids: string[],
    patch: { projectId?: string | null; taskId?: string | null }
  ) {
    if (!ids?.length) throw new BadRequestException('ids is required and must be non-empty');

    const update: Partial<Screenshot> = {};
    if ('projectId' in patch) update.projectId = patch.projectId ?? null;
    if ('taskId' in patch) update.taskId = patch.taskId ?? null;

    if (Object.keys(update).length === 0) {
      throw new BadRequestException('Nothing to update: provide projectId and/or taskId');
    }

    const res = await this.repo
      .createQueryBuilder()
      .update(Screenshot)
      .set(update)
      .where('"userId" = :userId', { userId })
      .andWhere('id IN (:...ids)', { ids })
      .andWhere('deleted = false')
      .returning(['id'])
      .execute();

    return { updated: res.raw.length, ids: res.raw.map((r: any) => r.id) };
  }
}

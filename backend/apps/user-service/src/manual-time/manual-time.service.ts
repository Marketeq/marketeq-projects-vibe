import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManualTimeEntry } from './manual-time-entry.entity';

export type ListManualTimeOpts = {
  limit?: number;
  dateFrom?: Date;
  dateTo?: Date;
};

function toDate(value: unknown, field: string): Date {
  const d = value instanceof Date ? value : new Date(value as any);
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    throw new BadRequestException(`${field} must be a valid ISO timestamp`);
  }
  return d;
}

@Injectable()
export class ManualTimeService {
  constructor(@InjectRepository(ManualTimeEntry) private repo: Repository<ManualTimeEntry>) {}

  async list(userId: string, opts: ListManualTimeOpts = {}) {
    const limit = Math.min(opts.limit ?? 50, 100);

    const qb = this.repo
      .createQueryBuilder('mte')
      .where('mte."userId" = :userId', { userId })
      .andWhere('mte.deleted = false')
      .orderBy('mte."startAt"', 'DESC')
      .limit(limit);

    if (opts.dateFrom) qb.andWhere('mte."startAt" >= :dateFrom', { dateFrom: opts.dateFrom });
    if (opts.dateTo) qb.andWhere('mte."startAt" < :dateTo', { dateTo: opts.dateTo });

    return qb.getMany();
  }

  async create(
    userId: string,
    body: { startAt: Date | string; endAt: Date | string; projectId?: string | null; taskId?: string | null; note?: string },
  ) {
    const startAt = toDate(body.startAt, 'startAt');
    const endAt = toDate(body.endAt, 'endAt');
    if (endAt <= startAt) throw new BadRequestException('endAt must be later than startAt');

    const row = this.repo.create({
      userId,
      projectId: body.projectId ?? null,
      taskId: body.taskId ?? null,
      startAt,
      endAt,
      note: body.note ?? '',
      approved: false,
      deleted: false,
    });

    return this.repo.save(row);
  }

  async update(
    id: string,
    userId: string,
    patch: Partial<Pick<ManualTimeEntry, 'startAt' | 'endAt' | 'projectId' | 'taskId' | 'note'>>,
  ) {
    const row = await this.repo.findOne({ where: { id, userId, deleted: false } });
    if (!row) throw new NotFoundException('Manual time entry not found');

    const nextStart = patch.startAt !== undefined ? toDate(patch.startAt, 'startAt') : row.startAt;
    const nextEnd = patch.endAt !== undefined ? toDate(patch.endAt, 'endAt') : row.endAt;
    if (nextEnd <= nextStart) {
      throw new BadRequestException('endAt must be later than startAt');
    }

    row.startAt = nextStart;
    row.endAt = nextEnd;
    if (patch.projectId !== undefined) row.projectId = patch.projectId ?? null;
    if (patch.taskId !== undefined) row.taskId = patch.taskId ?? null;
    if (patch.note !== undefined) row.note = patch.note ?? '';
    row.updatedAt = new Date();

    return this.repo.save(row);
  }

  async remove(id: string, userId: string, reason?: string) {
    const row = await this.repo.findOne({ where: { id, userId, deleted: false } });
    if (!row) throw new NotFoundException('Manual time entry not found');

    row.deleted = true;
    row.updatedAt = new Date();
    await this.repo.save(row);

    return { id: row.id, deleted: true, reason: reason ?? null };
  }
}

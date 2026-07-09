import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModerationLog, ModerationAction, ContentType } from './entities/moderation-log.entity';

@Injectable()
export class ModerationLogService {
  constructor(
    @InjectRepository(ModerationLog)
    private readonly logRepo: Repository<ModerationLog>,
  ) {}

  async getLogs(
    status?: string,
    contentType?: string,
    page: number = 1,
    perPage: number = 10,
  ): Promise<{ logs: ModerationLog[]; total: number; page: number; perPage: number }> {
    const qb = this.logRepo.createQueryBuilder('log').orderBy('log.timestamp', 'DESC');

    if (status) {
      qb.andWhere('log.action = :status', { status });
    }
    if (contentType) {
      qb.andWhere('log.contentType = :contentType', { contentType });
    }

    qb.skip((page - 1) * perPage).take(perPage);
    const [logs, total] = await qb.getManyAndCount();

    return { logs, total, page, perPage };
  }

  async createLog(data: {
    contentId: string;
    contentType?: ContentType;
    action: ModerationAction;
    reason: string | null;
    moderatorId?: string;
    meta?: Record<string, any>;
  }): Promise<ModerationLog> {
    return this.logRepo.save(this.logRepo.create({
      contentId: data.contentId,
      contentType: data.contentType ?? ContentType.PROJECT,
      action: data.action,
      reason: data.reason,
      moderatorId: data.moderatorId ?? null,
      meta: data.meta ?? null,
    }));
  }
}

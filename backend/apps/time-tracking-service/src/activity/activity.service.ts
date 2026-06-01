import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityMinute } from '../entities/activity-minute.entity';
import { UpsertActivityDto } from './dto/upsert-activity.dto';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityMinute) private readonly repo: Repository<ActivityMinute>,
  ) {}
 
  async upsert(sessionId: string, dto: UpsertActivityDto): Promise<{ inserted: number }> {
    let inserted = 0;
    for (const m of dto.minutes) {
      const existing = await this.repo.findOneBy({ id: m.id });
      if (existing) continue;
 
      await this.repo.save(this.repo.create({
        id: m.id,
        sessionId,
        minuteStartAt: new Date(m.minuteStartAt),
        active: m.active,
        idempotencyKey: m.idempotencyKey ?? null,
      }));
      inserted++;
    }
    return { inserted };
  }
 
  async findBySession(sessionId: string): Promise<ActivityMinute[]> {
    return this.repo.find({ where: { sessionId }, order: { minuteStartAt: 'ASC' } });
  }
}
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
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

      // The desktop can upload the same minute twice under different ids: pausing
      // flushes the partial minute, and resuming inside that same minute flushes it
      // again. activity_minutes is unique on (session_id, minute_start_at), so a plain
      // insert would 409 and the desktop would drop the row. Merge into the stored
      // minute instead: it counts as active if any upload for it was active.
      const minuteStartAt = new Date(m.minuteStartAt);
      if (await this.mergeIntoSameMinute(sessionId, minuteStartAt, m.active)) continue;

      try {
        await this.repo.save(this.repo.create({
          id: m.id,
          sessionId,
          minuteStartAt,
          active: m.active,
          idempotencyKey: m.idempotencyKey ?? null,
        }));
      } catch (err) {
        // Two uploads for the same minute raced past the check above.
        if (isUniqueViolation(err) && (await this.mergeIntoSameMinute(sessionId, minuteStartAt, m.active))) continue;
        throw err;
      }
      inserted++;
    }
    return { inserted };
  }

  private async mergeIntoSameMinute(sessionId: string, minuteStartAt: Date, active: boolean): Promise<boolean> {
    const sameMinute = await this.repo.findOneBy({ sessionId, minuteStartAt });
    if (!sameMinute) return false;
    if (active && !sameMinute.active) {
      await this.repo.update({ id: sameMinute.id }, { active: true });
    }
    return true;
  }
 
  async findBySession(sessionId: string): Promise<ActivityMinute[]> {
    return this.repo.find({ where: { sessionId }, order: { minuteStartAt: 'ASC' } });
  }
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof QueryFailedError && (err as QueryFailedError & { code?: string }).code === '23505';
}
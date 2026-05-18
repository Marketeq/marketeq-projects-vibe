import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { ActivityWatchEvent } from './entities/activity-watch-event.entity';
import { IngestActivityWatchEventsDto } from './dtos/ingest-activitywatch-events.dto';
import { QueryActivityWatchEventsDto } from './dtos/query-activitywatch-events.dto';
import { PageResult } from './infra/pagination';
import { ScanActivityDto } from './dtos/scan-activity.dto';

@Injectable()
export class ActivityWatchService {
  private readonly base =
    process.env.AW_REMOTE_URL ??
    process.env.ACTIVITYWATCH_BASE_URL ??
    'http://localhost:5600/api/0';

  constructor(
    private readonly http: HttpService,
    @InjectRepository(ActivityWatchEvent)
    private readonly repo: Repository<ActivityWatchEvent>,
  ) {}

  async info() {
    const response = await firstValueFrom<any>(this.http.get(`${this.base}/info`) as any);
    return response.data;
  }

  getHealth() {
    return { ok: true, service: 'activitywatch' };
  }

  async ingest(dto: IngestActivityWatchEventsDto, userId: string): Promise<{ inserted: number; ids: string[] }> {
    if (!userId) throw new BadRequestException('User identity is required');

    for (const e of dto.events) {
      const start = new Date(e.timestamp);
      if (isNaN(start.getTime())) {
        throw new BadRequestException('Invalid timestamp in payload');
      }
      if (e.duration < 0) {
        throw new BadRequestException('duration must be >= 0');
      }
    }

    const values: Partial<ActivityWatchEvent>[] = dto.events.map((e) => {
      const startTime = new Date(e.timestamp);
      const endTime = new Date(startTime.getTime() + e.duration * 1000);
      return {
        userId,
        bucketId: dto.bucketId,
        eventType: e.data?.app ? 'window' : e.data?.status ? 'afk' : 'unknown',
        data: e.data,
        startTime,
        endTime,
      };
    });

    const saved = await this.repo.save(values);
    const ids = saved.map((r) => r.id);
    return { inserted: ids.length, ids };
  }

  async findById(id: string): Promise<ActivityWatchEvent> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Event not found');
    return found;
  }

  async findMany(
    q: QueryActivityWatchEventsDto,
    requestUserId: string,
    isAdmin: boolean,
  ): Promise<PageResult<ActivityWatchEvent>> {
    const page = q.page ?? 1;
    const limit = Math.max(1, Math.min(500, q.limit ?? 100));
    const skip = (page - 1) * limit;

    const where: any = {};
    // Non-admins can only see their own events; admins may filter by any userId or see all
    where.userId = isAdmin && q.userId ? q.userId : requestUserId;
    if (q.bucketId) where.bucketId = q.bucketId;

    const MAX_DATE = new Date(8640000000000000);
    const MIN_DATE = new Date(0);

    if (q.from && q.to) {
      where.startTime = Between(new Date(q.from), new Date(q.to));
    } else if (q.from) {
      where.startTime = Between(new Date(q.from), MAX_DATE);
    } else if (q.to) {
      where.startTime = Between(MIN_DATE, new Date(q.to));
    }

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { startTime: 'DESC' as const },
      skip,
      take: limit,
    });

    return { items, page, limit, total };
  }

  async scanForAnomalies(q: ScanActivityDto, requestUserId: string, isAdmin: boolean) {
    const where: any = {};
    // Non-admins can only scan their own events
    where.userId = isAdmin && q.userId ? q.userId : requestUserId;
    if (q.bucketId) where.bucketId = q.bucketId;

    const MAX_DATE = new Date(8640000000000000);
    const MIN_DATE = new Date(0);

    if (q.from && q.to) {
      where.startTime = Between(new Date(q.from), new Date(q.to));
    } else if (q.from) {
      where.startTime = Between(new Date(q.from), MAX_DATE);
    } else if (q.to) {
      where.startTime = Between(MIN_DATE, new Date(q.to));
    } else {
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      where.startTime = Between(start, end);
    }

    const events = await this.repo.find({ where, order: { startTime: 'ASC' as const } });

    const anomalies: any[] = [];
    const gapMs = (q.gapMin ?? 10) * 60 * 1000;
    const afkMs = (q.afkMin ?? 5) * 60 * 1000;
    const longMs = (q.maxWindowHours ?? 8) * 60 * 60 * 1000;

    for (let i = 0; i < events.length; i++) {
      const cur = events[i];
      const next = events[i + 1];
      const curDur = new Date(cur.endTime!).getTime() - new Date(cur.startTime!).getTime();

      const isAfk =
        cur.bucketId === 'aw-watcher-afk' || cur.eventType?.toLowerCase() === 'afk';
      if (isAfk && curDur > afkMs) {
        anomalies.push({
          type: 'LONG_AFK',
          start: cur.startTime,
          end: cur.endTime,
          minutes: Math.round(curDur / 60000),
          context: { bucketId: cur.bucketId, eventType: cur.eventType, id: cur.id },
        });
      }

      const isWindow =
        cur.bucketId === 'aw-watcher-window' || cur.eventType?.toLowerCase() === 'window';
      if (isWindow && curDur > longMs) {
        anomalies.push({
          type: 'LONG_WINDOW_EVENT',
          start: cur.startTime,
          end: cur.endTime,
          hours: +(curDur / 3600000).toFixed(2),
          context: {
            bucketId: cur.bucketId,
            eventType: cur.eventType,
            id: cur.id,
            title: (cur.data as any)?.title,
          },
        });
      }

      if (next && new Date(cur.endTime!).getTime() > new Date(next.startTime!).getTime()) {
        anomalies.push({
          type: 'OVERLAP',
          current: { id: cur.id, start: cur.startTime, end: cur.endTime },
          next: { id: next.id, start: next.startTime, end: next.endTime },
        });
      }

      if (next) {
        const gap = new Date(next.startTime!).getTime() - new Date(cur.endTime!).getTime();
        if (gap > gapMs) {
          anomalies.push({
            type: 'LARGE_GAP',
            afterEventId: cur.id,
            gapMinutes: Math.round(gap / 60000),
            gapStart: cur.endTime,
            gapEnd: next.startTime,
          });
        }
      }
    }

    return { scanned: events.length, anomalies };
  }
}

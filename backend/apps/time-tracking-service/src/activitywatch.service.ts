import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { ActivityWatchEvent } from './entities/activity-watch-event.entity';
import { IngestActivityWatchEventsDto } from './dto/ingest-activitywatch-events.dto';
import { QueryActivityWatchEventsDto } from './dto/query-activitywatch-events.dto';
import { PageResult } from './infra/pagination';
import { ScanActivityDto } from './dto/scan-activity.dto';

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
    const response = await firstValueFrom<any>(this.http.get(`${this.base}/info`));
    return response.data;
  }

  getHealth() {
    return { ok: true, service: 'activitywatch' };
  }

  async ingest(dto: IngestActivityWatchEventsDto): Promise<{ inserted: number; ids: string[] }> {
    for (const e of dto.events) {
      const start = new Date(e.startTime);
      const end = new Date(e.endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Invalid timestamp(s) in payload');
      }
      if (start > end) throw new BadRequestException('startTime must be <= endTime');
    }

    const values = dto.events.map((e) => ({
      userId: e.userId ?? null,
      bucketId: e.bucketId,
      eventType: e.eventType,
      data: e.data,
      startTime: new Date(e.startTime),
      endTime: new Date(e.endTime),
    }));

    const saved = await this.repo.save(values as any[]);
    const savedArr = Array.isArray(saved) ? saved : [saved];
    const ids = savedArr.map((r) => r.id as string);
    return { inserted: ids.length, ids };
  }

  async findById(id: string): Promise<ActivityWatchEvent> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Event not found');
    return found;
  }

  async findMany(q: QueryActivityWatchEventsDto): Promise<PageResult<ActivityWatchEvent>> {
    const page = q.page ?? 1;
    const limit = Math.max(1, Math.min(500, q.limit ?? 100));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q.userId) where.userId = q.userId;
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

    const items = await this.repo.find({
      where,
      order: { startTime: 'DESC' as const },
      skip,
      take: limit,
    });

    let total: number;
    try {
      total = await (this.repo as any).count({ where });
    } catch {
      total = (await this.repo.find({ where })).length;
    }

    return { items, page, limit, total };
  }

  async scanForAnomalies(q: ScanActivityDto) {
    const where: any = {};
    if (q.userId) where.userId = q.userId;
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

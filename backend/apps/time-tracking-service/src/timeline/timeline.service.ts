import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { listBuckets, getEvents } from '../aw.client';
import { Screenshot } from '../screenshots/screenshots.entity';

type EventSeg = {
  start: string;
  end: string;
  sourceBucket: string;
  app?: string;
  title?: string;
  afk?: boolean;
};

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(
    @InjectRepository(Screenshot)
    private readonly shots: Repository<Screenshot>,
  ) {}

  private toUTC(d: Date | string) {
    return new Date(d).toISOString();
  }

  async buildTimeline(params: { userId: string; contractId?: string; from: string; to: string }) {
    const startDate = new Date(params.from);
    const endDate = new Date(params.to);
    if (isNaN(startDate.getTime())) throw new BadRequestException(`Invalid "from" date: ${params.from}`);
    if (isNaN(endDate.getTime())) throw new BadRequestException(`Invalid "to" date: ${params.to}`);

    const startISO = this.toUTC(params.from);
    const endISO   = this.toUTC(params.to);

    const shots = await this.shots.find({
      where: {
        userId: params.userId,
        isDeleted: false,
        capturedAt: Between(new Date(startISO), new Date(endISO)),
      },
      order: { capturedAt: 'ASC' },
    });

    const raw = await listBuckets().catch((err: any) => {
      this.logger.warn(`Failed to fetch AW buckets: ${err?.message ?? err}`);
      return [];
    });
    const bucketList = Array.isArray(raw) ? raw : Object.values(raw ?? {});
    const buckets = bucketList.filter(
      (b: any) =>
        b.id.startsWith('aw-watcher-window_') || b.id.startsWith('aw-watcher-afk_'),
    );

    const events: EventSeg[] = [];
    for (const b of buckets as Array<{ id: string }>) {
      const evs = await getEvents(b.id, startISO, endISO);
      for (const e of evs) {
        const start = new Date(e.timestamp!).toISOString();
        const durMs = Math.max(0, Math.floor((e.duration ?? 0) * 1000));
        const end = durMs
          ? new Date(new Date(e.timestamp!).getTime() + durMs).toISOString()
          : start;
        events.push({
          start,
          end,
          sourceBucket: b.id,
          app: e.data?.app,
          title: e.data?.title,
          afk:
            typeof e.data?.status === 'string'
              ? e.data.status !== 'not-afk'
              : undefined,
        });
      }
    }

    const out = [];
    let i = 0;
    const threshMs = 30_000;

    for (const ev of events.sort((a, b) => a.start.localeCompare(b.start))) {
      while (
        i + 1 < shots.length &&
        Math.abs(
          new Date(shots[i + 1].capturedAt!).getTime() - new Date(ev.start).getTime(),
        ) <
          Math.abs(
            new Date(shots[i].capturedAt!).getTime() - new Date(ev.start).getTime(),
          )
      ) {
        i++;
      }
      const s = shots[i];
      const sMs = s
        ? Math.abs(new Date(s.capturedAt!).getTime() - new Date(ev.start).getTime())
        : Infinity;
      out.push({
        ...ev,
        screenshot:
          s && sMs <= threshMs
            ? { key: s.key, bytes: s.bytes, mimeType: s.mimeType, capturedAt: s.capturedAt }
            : null,
      });
    }

    return {
      from: startISO,
      to: endISO,
      userId: params.userId,
      buckets: buckets.map((b: any) => b.id),
      events: out,
    };
  }
}

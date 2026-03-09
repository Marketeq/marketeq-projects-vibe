import { Injectable } from '@nestjs/common';
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
  constructor(
    @InjectRepository(Screenshot)
    private readonly shots: Repository<Screenshot>,
  ) {}

  private toUTC(d: Date | string) {
    return new Date(d).toISOString();
  }

  async buildTimeline(params: { userId: string; projectId?: string; from: string; to: string }) {
    const startISO = this.toUTC(params.from);
    const endISO   = this.toUTC(params.to);

    const shots = await this.shots.find({
      where: {
        userId: params.userId,
        isDeleted: false,
        createdAt: Between(new Date(startISO), new Date(endISO)),
      },
      order: { createdAt: 'ASC' },
    });

    const raw = await listBuckets().catch(() => []);
    const bucketList = Array.isArray(raw) ? raw : Object.values(raw ?? {});
    const buckets = bucketList.filter(
      (b: any) =>
        b.id.startsWith('aw-watcher-window_') || b.id.startsWith('aw-watcher-afk_'),
    );

    const events: EventSeg[] = [];
    for (const b of buckets) {
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
          new Date(shots[i + 1].createdAt).getTime() - new Date(ev.start).getTime(),
        ) <
          Math.abs(
            new Date(shots[i].createdAt).getTime() - new Date(ev.start).getTime(),
          )
      ) {
        i++;
      }
      const s = shots[i];
      const sMs = s
        ? Math.abs(new Date(s.createdAt).getTime() - new Date(ev.start).getTime())
        : Infinity;
      out.push({
        ...ev,
        screenshot:
          s && sMs <= threshMs
            ? { key: s.key, bytes: s.bytes, mimeType: s.mimeType, createdAt: s.createdAt }
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

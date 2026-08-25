import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventsService } from './events.service';

@Injectable()
export class EarningsSyncService {
  private readonly logger = new Logger(EarningsSyncService.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly events: EventsService,
  ) {}

  async syncScreenshot(params: {
    userId: string;
    contractId: string;
    taskId: string | null;
    capturedAt: Date;
  }): Promise<void> {
    const { userId, contractId, taskId, capturedAt } = params;
    try {
      const day = capturedAt.toLocaleDateString('en-CA');

      // Query TTS-owned tables only (time_tracking schema)
      const aggRows = await this.ds.query(
        `SELECT
           count(*)::int                     AS screenshot_count,
           min(captured_at)                  AS first_at,
           max(captured_at)                  AS last_at,
           round(avg(keyboard_pct)::numeric) AS avg_kbd,
           round(avg(mouse_pct)::numeric)    AS avg_mouse
         FROM time_tracking.screenshots
         WHERE user_id     = $1
           AND contract_id = $2
           AND ($3::text IS NULL OR task_id = $3)
           AND is_deleted  = false
           AND captured_at IS NOT NULL
           AND date_trunc('day', captured_at) = $4::date`,
        [userId, contractId, taskId, day],
      );

      if (!aggRows.length || aggRows[0].screenshot_count === 0) return;
      const agg = aggRows[0];

      let taskName: string | null = null;
      if (taskId) {
        const taskRows = await this.ds.query(
          `SELECT name FROM time_tracking.contract_tasks WHERE id = $1`,
          [taskId],
        );
        taskName = taskRows[0]?.name ?? null;
      }

      // Publish via RabbitMQ — earnings-service consumes asynchronously
      this.events.screenshotConfirmed({
        userId,
        contractId,
        taskId,
        taskName,
        day,
        screenshotCount: agg.screenshot_count,
        firstAt: String(agg.first_at),
        lastAt: String(agg.last_at),
        avgKbd: parseInt(agg.avg_kbd) || 0,
        avgMouse: parseInt(agg.avg_mouse) || 0,
      });

      this.logger.log(
        `EarningsSync: published earnings.screenshot_confirmed for ${contractId} ${day}`,
      );
    } catch (err: any) {
      this.logger.error(`EarningsSync failed: ${err.message}`, err.stack);
    }
  }

  async syncManualTime(entry: {
    id: string;
    userId: string;
    contractId: string | null;
    taskId: string | null;
    startTime: Date;
    endTime: Date;
  }): Promise<void> {
    // No contract to bill against — nothing to sync (same constraint the
    // screenshot path has implicitly, since it's never called without one).
    if (!entry.contractId) return;
    try {
      let taskName: string | null = null;
      if (entry.taskId) {
        const taskRows = await this.ds.query(
          `SELECT name FROM time_tracking.contract_tasks WHERE id = $1`,
          [entry.taskId],
        );
        taskName = taskRows[0]?.name ?? null;
      }

      const durationMinutes = Math.round(
        (entry.endTime.getTime() - entry.startTime.getTime()) / 60000,
      );

      this.events.manualTimeConfirmed({
        userId: entry.userId,
        contractId: entry.contractId,
        taskId: entry.taskId,
        taskName,
        manualTimeId: entry.id,
        startTime: entry.startTime.toISOString(),
        endTime: entry.endTime.toISOString(),
        durationMinutes,
      });

      this.logger.log(
        `EarningsSync: published earnings.manual_time_confirmed for ${entry.contractId} ${entry.id}`,
      );
    } catch (err: any) {
      this.logger.error(`EarningsSync (manual) failed: ${err.message}`, err.stack);
    }
  }
}
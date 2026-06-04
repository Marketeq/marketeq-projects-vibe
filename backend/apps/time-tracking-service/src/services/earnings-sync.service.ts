import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EarningsSyncService {
  private readonly logger = new Logger(EarningsSyncService.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly http: HttpService,
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

      // Query TTS-owned tables only
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
          `SELECT name FROM time_tracking.contract_tasks WHERE id = $1`, [taskId],
        );
        taskName = taskRows[0]?.name ?? null;
      }

      // Delegate earnings upsert to earnings-service via internal HTTP endpoint
      const earningsUrl = process.env.EARNINGS_SERVICE_URL ?? 'http://localhost:3026';
      const internalToken = process.env.INTERNAL_SERVICE_TOKEN ?? 'marketeq-internal-dev';

      await firstValueFrom(
        this.http.post(`${earningsUrl}/v1/internal/sync-screenshot`, {
          userId,
          contractId,
          taskId,
          taskName,
          day,
          screenshotCount: agg.screenshot_count,
          firstAt: agg.first_at,
          lastAt: agg.last_at,
          avgKbd: parseInt(agg.avg_kbd) || 0,
          avgMouse: parseInt(agg.avg_mouse) || 0,
        }, {
          headers: { 'x-internal-token': internalToken },
        }),
      );

      this.logger.log(`EarningsSync: delegated to earnings-service for ${contractId} ${day}`);
    } catch (err) {
      this.logger.error(`EarningsSync failed: ${err.message}`, err.stack);
    }
  }
}
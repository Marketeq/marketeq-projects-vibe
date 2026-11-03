import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import axios from 'axios';
import { EventsService } from './events.service';
import { ContractPartiesClient } from '../contracts/contract-parties.client';

// earnings-service bills each synced screenshot as this many minutes
// (internal-sync.service.ts durationMinutes). Caps are converted with it.
const BILLED_MINUTES_PER_SCREENSHOT = 10;

@Injectable()
export class EarningsSyncService {
  private readonly logger = new Logger(EarningsSyncService.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly events: EventsService,
    private readonly parties: ContractPartiesClient,
  ) {}

  // PMCM-829: the contract's weekly cap, in billable screenshots. Null when
  // the contract has no cap. A failed lookup throws, so nothing is synced
  // uncapped — the next screenshot event for the day re-syncs it.
  private async weeklyCapScreenshots(contractId: string): Promise<number | null> {
    const parties = await this.parties.getParties([contractId]);
    const hours = parties.get(contractId)?.weeklyCapHours;
    if (hours == null || !(hours > 0)) return null;
    return Math.floor((hours * 60) / BILLED_MINUTES_PER_SCREENSHOT);
  }

  async syncScreenshot(params: {
    userId: string;
    contractId: string;
    taskId: string | null;
    capturedAt: Date;
  }): Promise<void> {
    const { userId, contractId, taskId, capturedAt } = params;
    try {
      const day = capturedAt.toLocaleDateString('en-CA');

      // Blurred time counts when the contract's blurred_billable setting says
      // so (default true). Deleted time never counts, and flagged time waits
      // until the client reviews it (review clears is_flagged) — per the
      // Screenshot Deletion and Moderation backend docs.
      // Query TTS-owned tables only (time_tracking schema)
      const aggRows = await this.ds.query(
        `WITH rules AS (
           SELECT coalesce((SELECT blurred_billable FROM time_tracking.admin_settings WHERE scope_id = $2), true) AS blurred_billable
         )
         SELECT
           count(*)::int                     AS screenshot_count,
           min(captured_at)                  AS first_at,
           max(captured_at)                  AS last_at,
           round(avg(keyboard_pct)::numeric) AS avg_kbd,
           round(avg(mouse_pct)::numeric)    AS avg_mouse
         FROM time_tracking.screenshots, rules
         WHERE user_id     = $1
           AND contract_id = $2
           AND ($3::text IS NULL OR task_id = $3)
           AND is_deleted  = false
           AND is_flagged  = false
           AND (is_blurred = false OR rules.blurred_billable)
           AND captured_at IS NOT NULL
           AND date_trunc('day', captured_at) = $4::date`,
        [userId, contractId, taskId, day],
      );

      if (!aggRows.length) return;
      const agg = aggRows[0];
      let screenshotCount = agg.screenshot_count ?? 0;

      // PMCM-829: time over the contract's weekly cap is not billed. The
      // week's billable screenshots are taken in capture order (ISO week,
      // Monday start) and only the first `cap` of them count; this
      // task+day bills its share of those.
      const cap = await this.weeklyCapScreenshots(contractId);
      if (cap !== null && screenshotCount > 0) {
        const capRows = await this.ds.query(
          `WITH rules AS (
             SELECT coalesce((SELECT blurred_billable FROM time_tracking.admin_settings WHERE scope_id = $2), true) AS blurred_billable
           ), week AS (
             SELECT task_id, captured_at,
                    row_number() OVER (ORDER BY captured_at, id) AS rn
             FROM time_tracking.screenshots, rules
             WHERE user_id     = $1
               AND contract_id = $2
               AND is_deleted  = false
               AND is_flagged  = false
               AND (is_blurred = false OR rules.blurred_billable)
               AND captured_at IS NOT NULL
               AND date_trunc('week', captured_at) = date_trunc('week', $4::date)
           )
           SELECT count(*)::int AS billable
           FROM week
           WHERE rn <= $5
             AND ($3::text IS NULL OR task_id = $3)
             AND date_trunc('day', captured_at) = $4::date`,
          [userId, contractId, taskId, day, cap],
        );
        const billable = capRows[0]?.billable ?? 0;
        if (billable < screenshotCount) {
          this.logger.log(
            `EarningsSync: weekly cap reached for ${contractId} — billing ${billable} of ${screenshotCount} screenshots on ${day}`,
          );
          screenshotCount = billable;
        }
      }

      let taskName: string | null = null;
      if (taskId) {
        const taskRows = await this.ds.query(
          `SELECT name FROM time_tracking.contract_tasks WHERE id = $1`,
          [taskId],
        );
        taskName = taskRows[0]?.name ?? null;
      }

      // When every screenshot for this contract+task+day has been deleted
      // or blurred, min/max above come back NULL (no rows to aggregate) —
      // but earnings-service's earnings_cache.work_start_at/work_end_at
      // don't allow NULL. Fall back to the start of the day so this still
      // correctly zeroes out that day's billed amount instead of leaving
      // the previous (stale, non-zero) entry in place.
      const dayStartIso = new Date(`${day}T00:00:00.000Z`).toISOString();
      const firstAt = agg.first_at ? new Date(agg.first_at).toISOString() : dayStartIso;
      const lastAt = agg.last_at ? new Date(agg.last_at).toISOString() : dayStartIso;

      // POST directly to earnings-service's internal sync endpoint. The
      // RabbitMQ path (time-tracking-service -> earnings-service) has
      // pre-existing transport bugs unrelated to this fix (mismatched
      // queue name/arguments, wrong NestJS decorator on the consumer);
      // this reuses the already-working, already-secured HTTP path
      // instead of repairing that pipe.
      const earningsServiceUrl = process.env.EARNINGS_SERVICE_URL || 'http://localhost:3026';
      await axios.post(
        `${earningsServiceUrl}/v1/internal/sync-screenshot`,
        {
          userId,
          contractId,
          taskId,
          taskName,
          day,
          screenshotCount,
          firstAt,
          lastAt,
          avgKbd: parseInt(agg.avg_kbd) || 0,
          avgMouse: parseInt(agg.avg_mouse) || 0,
        },
        { headers: { 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN } },
      );

      this.logger.log(
        `EarningsSync: synced screenshot totals for ${contractId} ${day}`,
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
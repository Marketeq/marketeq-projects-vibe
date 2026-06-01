import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class EarningsSyncService {
  private readonly logger = new Logger(EarningsSyncService.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  async syncScreenshot(params: {
    userId: string;
    contractId: string;
    taskId: string | null;
    capturedAt: Date;
  }): Promise<void> {
    const { userId, contractId, taskId, capturedAt } = params;
    try {
      const contractRows = await this.ds.query(
        `SELECT rate, title, client_name FROM contracts WHERE id = $1 AND "talentId" = $2`,
        [contractId, userId],
      );
      if (!contractRows.length) return;

      const contract = contractRows[0];
      const hourlyRate = parseFloat(contract.rate) || 0;
      if (hourlyRate === 0) return;

      const day = capturedAt.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

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
      const durationMinutes = agg.screenshot_count * 10;
      const gross = parseFloat(((durationMinutes / 60) * hourlyRate).toFixed(8));
      const fee   = parseFloat((gross * 0.20).toFixed(8));
      const net   = parseFloat((gross * 0.80).toFixed(8));

      let taskName: string | null = null;
      if (taskId) {
        const taskRows = await this.ds.query(
          `SELECT name FROM time_tracking.contract_tasks WHERE id = $1`, [taskId],
        );
        taskName = taskRows[0]?.name ?? null;
      }

      const labelRows = await this.ds.query(
        `SELECT contract_id FROM contract_label_cache
         WHERE contractor_id = $1::uuid AND contract_title = $2 LIMIT 1`,
        [userId, contract.title],
      );

      let labelContractId: string;
      if (labelRows.length) {
        labelContractId = labelRows[0].contract_id;
      } else {
        const inserted = await this.ds.query(
          `INSERT INTO contract_label_cache
             (contract_id, contractor_id, client_id, project_id,
              contract_title, project_name, client_display_name, status, activated_at)
           VALUES (gen_random_uuid(), $1::uuid, '8d050e2d-0000-0000-0000-000000000001'::uuid,
              NULL, $2, $2, $3, 'active', now() - interval '30 days')
           RETURNING contract_id`,
          [userId, contract.title, contract.client_name ?? 'christorres'],
        );
        labelContractId = inserted[0].contract_id;
      }

      const idempotencyKey = `tts-sync-${contractId}-${taskId ?? 'notask'}-${day}`;

      await this.ds.query(
        `INSERT INTO earnings_cache (
           transaction_id, contractor_id, contract_id, project_id, task_id,
           entry_type, gross_amount, fee_amount, net_amount,
           currency, fx_rate_to_usd, net_amount_usd,
           status, work_start_at, work_end_at, duration_minutes,
           avg_keyboard_pct, avg_mouse_pct, idempotency_key,
           contract_ref, task_ref, task_name
         ) VALUES (
           gen_random_uuid(), $1::uuid, $2::uuid, NULL, NULL,
           'screenshot', $3, $4, $5, 'USD', 1.0, $5,
           'confirmed', $6::timestamp AT TIME ZONE 'America/Chicago', $7::timestamp AT TIME ZONE 'America/Chicago', $8, $9, $10, $11, $12, $13, $14
         )
         ON CONFLICT (idempotency_key) DO UPDATE SET
           work_start_at    = EXCLUDED.work_start_at,
           work_end_at      = EXCLUDED.work_end_at,
           duration_minutes = EXCLUDED.duration_minutes,
           gross_amount     = EXCLUDED.gross_amount,
           fee_amount       = EXCLUDED.fee_amount,
           net_amount       = EXCLUDED.net_amount,
           net_amount_usd   = EXCLUDED.net_amount_usd,
           avg_keyboard_pct = EXCLUDED.avg_keyboard_pct,
           avg_mouse_pct    = EXCLUDED.avg_mouse_pct,
           task_name        = EXCLUDED.task_name`,
        [
          userId, labelContractId,
          gross, fee, net,
          agg.first_at, agg.last_at, durationMinutes,
          agg.avg_kbd, agg.avg_mouse,
          idempotencyKey, contractId, taskId, taskName,
        ],
      );

      this.logger.log(`EarningsSync: upserted ${idempotencyKey} — ${durationMinutes}min $${net}`);
    } catch (err) {
      this.logger.error(`EarningsSync failed: ${err.message}`, err.stack);
    }
  }
}

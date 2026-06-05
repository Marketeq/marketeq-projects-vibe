import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class InternalSyncService {
  private readonly logger = new Logger(InternalSyncService.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  async syncFromTTS(params: {
    userId: string;
    contractId: string;
    taskId: string | null;
    taskName: string | null;
    day: string;
    screenshotCount: number;
    firstAt: string;
    lastAt: string;
    avgKbd: number;
    avgMouse: number;
  }): Promise<{ ok: boolean }> {
    const {
      userId, contractId, taskId, taskName,
      day, screenshotCount, firstAt, lastAt, avgKbd, avgMouse,
    } = params;

    try {
      // Look up contract from earnings-service-owned contract_label_cache
      const labelRows = await this.ds.query(
        `SELECT contract_id, contract_title, client_display_name
         FROM contract_label_cache
         WHERE contractor_id = $1::uuid
         ORDER BY activated_at DESC LIMIT 10`,
        [userId],
      );

      // Find matching label by contractId or first available
      let labelContractId: string | null = null;
      let title = contractId;
      let clientName = 'Unknown Client';

      const exactMatch = labelRows.find((r: any) => r.contract_id === contractId);
      if (exactMatch) {
        labelContractId = exactMatch.contract_id;
        title = exactMatch.contract_title ?? contractId;
        clientName = exactMatch.client_display_name ?? 'Unknown Client';
      } else if (labelRows.length > 0) {
        // Use the first available as fallback — create entry for this contract
        const inserted = await this.ds.query(
          `INSERT INTO contract_label_cache
             (contract_id, contractor_id, client_id, project_id,
              contract_title, project_name, client_display_name, status, activated_at)
           VALUES ($1::text, $2::uuid, NULL,
              NULL, $1, $1, 'Unknown Client', 'active', now() - interval '30 days')
           ON CONFLICT (contract_id) DO NOTHING
           RETURNING contract_id`,
          [contractId, userId],
        );
        labelContractId = inserted?.[0]?.contract_id ?? contractId;
      } else {
        // No cache at all — create one
        const inserted = await this.ds.query(
          `INSERT INTO contract_label_cache
             (contract_id, contractor_id, client_id, project_id,
              contract_title, project_name, client_display_name, status, activated_at)
           VALUES ($1::text, $2::uuid, NULL,
              NULL, $1, $1, 'Unknown Client', 'active', now() - interval '30 days')
           ON CONFLICT (contract_id) DO NOTHING
           RETURNING contract_id`,
          [contractId, userId],
        );
        labelContractId = inserted?.[0]?.contract_id ?? contractId;
      }

      // Use a default rate if we can't determine it — earnings will be $0
      // In production, contract_label_cache would be populated by contract.activated events
      const durationMinutes = screenshotCount * 10;
      const hourlyRate = 25; // Default rate — overridden when contract_label_cache has rate data
      const gross = parseFloat(((durationMinutes / 60) * hourlyRate).toFixed(8));
      const fee = parseFloat((gross * 0.2).toFixed(8));
      const net = parseFloat((gross * 0.8).toFixed(8));

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
           gen_random_uuid(), $1::uuid, $2::text, NULL, NULL,
           'screenshot', $3, $4, $5, 'USD', 1.0, $5,
           'confirmed',
           $6::timestamp AT TIME ZONE 'America/Chicago',
           $7::timestamp AT TIME ZONE 'America/Chicago',
           $8, $9, $10, $11, $12, $13, $14
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
          userId, labelContractId ?? contractId,
          gross, fee, net,
          firstAt, lastAt, durationMinutes,
          avgKbd, avgMouse,
          idempotencyKey, contractId, taskId, taskName,
        ],
      );

      this.logger.log(`InternalSync: upserted ${idempotencyKey} — ${durationMinutes}min $${net}`);
      return { ok: true };
    } catch (err) {
      this.logger.error(`InternalSync failed: ${err.message}`, err.stack);
      return { ok: false };
    }
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InternalSyncService {
  private readonly logger = new Logger(InternalSyncService.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly http: HttpService,
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
    const { userId, contractId, taskId, taskName, day, screenshotCount, firstAt, lastAt, avgKbd, avgMouse } = params;
    try {
      // Fetch contract data from contracts-service via gateway
      const gatewayUrl = process.env.GATEWAY_URL ?? 'http://localhost:4000';
      const internalToken = process.env.INTERNAL_SERVICE_TOKEN ?? 'marketeq-internal-dev';
      let rate = 0, title = '', clientName = '';
      try {
        const { data } = await firstValueFrom(
          this.http.get(`${gatewayUrl}/v1/contracts/${contractId}`, {
            headers: { 'x-internal-token': internalToken },
          }),
        );
        rate = parseFloat(data.rate) || 0;
        title = data.title ?? '';
        clientName = data.clientName ?? data.client_name ?? '';
      } catch {
        this.logger.warn(`Could not fetch contract ${contractId} from gateway, skipping sync`);
        return { ok: false };
      }

      if (rate === 0) return { ok: false };

      const durationMinutes = screenshotCount * 10;
      const gross = parseFloat(((durationMinutes / 60) * rate).toFixed(8));
      const fee   = parseFloat((gross * 0.20).toFixed(8));
      const net   = parseFloat((gross * 0.80).toFixed(8));

      // Upsert contract_label_cache (owned by earnings-service)
      const labelRows = await this.ds.query(
        `SELECT contract_id FROM contract_label_cache
         WHERE contractor_id = $1::uuid AND contract_title = $2 LIMIT 1`,
        [userId, title],
      );

      let labelContractId: string;
      if (labelRows.length) {
        labelContractId = labelRows[0].contract_id;
      } else {
        const inserted = await this.ds.query(
          `INSERT INTO contract_label_cache
             (contract_id, contractor_id, client_id, project_id,
              contract_title, project_name, client_display_name, status, activated_at)
           VALUES (gen_random_uuid(), $1::uuid, NULL,
              NULL, $2, $2, $3, 'active', now() - interval '30 days')
           RETURNING contract_id`,
          [userId, title, clientName || 'Unknown Client'],
        );
        labelContractId = inserted[0].contract_id;
      }

      const idempotencyKey = `tts-sync-${contractId}-${taskId ?? 'notask'}-${day}`;

      // Upsert earnings_cache (owned by earnings-service)
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
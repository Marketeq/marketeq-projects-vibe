import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Weekly background worker that enforces the 7-year IP address retention policy.
 *
 * Per LS-06 §7.7: IP addresses stored in ls_nda_signing_events must be purged
 * (set to NULL) after 7 years from the signing date. All other audit fields
 * remain intact — the signing record itself is never deleted.
 *
 * How it works:
 *  1. Runs once on startup to catch any missed executions.
 *  2. Repeats every 7 days via setInterval.
 *  3. Logs the count of affected rows using the structured log format from LS-06 §3.2.
 *  4. Warns if more than 1,000 rows are affected in a single run (indicates
 *     the job may have been paused for an extended period).
 */
@Injectable()
export class DataRetentionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DataRetentionWorker.name);
  private timer!: NodeJS.Timeout;
  private readonly POLL_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit(): void {
    // Run once immediately on startup (catches missed runs after downtime)
    void this.purgeExpiredIpAddresses();
    this.timer = setInterval(
      () => void this.purgeExpiredIpAddresses(),
      this.POLL_INTERVAL_MS,
    );
    this.logger.log('DataRetentionWorker started — IP purge runs weekly');
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
    this.logger.log('DataRetentionWorker stopped');
  }

  private async purgeExpiredIpAddresses(): Promise<void> {
    try {
      const result = await this.dataSource.query(
        `UPDATE ls_nda_signing_events
         SET "ipAddress" = NULL
         WHERE "signedAtUtc" < NOW() - INTERVAL '7 years'
           AND "ipAddress" IS NOT NULL`,
      );
      const rowsAffected = result[1] ?? 0;

      if (rowsAffected > 1000) {
        this.logger.warn(
          `IP purge: rowsAffected=${rowsAffected} — large batch, verify job cadence`,
        );
      } else if (rowsAffected > 0) {
        this.logger.log(`IP purge completed: rowsAffected=${rowsAffected}`);
      }
      // rowsAffected === 0 → nothing to purge, no log needed
    } catch (err: unknown) {
      this.logger.error(
        'IP purge job failed',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}

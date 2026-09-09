import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { BrowsingHistory } from '../entities/browsing-history.entity';

/**
 * The retention window and max-items-per-user cap are both explicitly
 * unconfirmed in the source Product Requirements — still open as of Doc 03
 * Q9/Q10. This job exists so the capability to enforce them is in place
 * (per Doc 01's architecture decision), but it enforces nothing until both
 * env vars are actually set. No number is invented here.
 */
@Injectable()
export class BrowsingHistoryCleanupTask {
  private readonly logger = new Logger(BrowsingHistoryCleanupTask.name);

  constructor(
    @InjectRepository(BrowsingHistory)
    private readonly repo: Repository<BrowsingHistory>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run(): Promise<void> {
    const retentionDays = Number(process.env.BROWSING_HISTORY_RETENTION_DAYS || 0);
    const maxPerUser = Number(process.env.BROWSING_HISTORY_MAX_PER_USER || 0);

    if (!retentionDays && !maxPerUser) {
      this.logger.debug(
        'Cleanup skipped — BROWSING_HISTORY_RETENTION_DAYS / BROWSING_HISTORY_MAX_PER_USER not set.',
      );
      return;
    }

    if (retentionDays > 0) {
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const result = await this.repo.delete({ lastViewedAt: LessThan(cutoff) });
      this.logger.log(`Retention cleanup removed ${result.affected ?? 0} record(s) older than ${retentionDays}d.`);
    }

    if (maxPerUser > 0) {
      // Per-user cap: trim each user's history down to the N most recent,
      // batched so this never holds one giant transaction.
      const overCap: Array<{ userId: string }> = await this.repo
        .createQueryBuilder('bh')
        .select('bh.userId', 'userId')
        .groupBy('bh.userId')
        .having('COUNT(*) > :max', { max: maxPerUser })
        .getRawMany();

      for (const { userId } of overCap) {
        const excessIds = await this.repo
          .createQueryBuilder('bh')
          .select('bh.id', 'id')
          .where('bh.userId = :userId', { userId })
          .orderBy('bh.lastViewedAt', 'DESC')
          .offset(maxPerUser)
          .getRawMany();

        if (excessIds.length > 0) {
          await this.repo.delete(excessIds.map((r) => r.id));
        }
      }
      this.logger.log(`Per-user cap cleanup processed ${overCap.length} user(s) over ${maxPerUser} items.`);
    }
  }
}

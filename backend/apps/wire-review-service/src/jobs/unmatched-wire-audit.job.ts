import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan } from 'typeorm';
import { WireMatchCandidate } from '../entities/wire-match-candidate.entity';

@Injectable()
export class UnmatchedWireAuditJob {
  private readonly logger = new Logger(UnmatchedWireAuditJob.name);

  constructor(
    @InjectRepository(WireMatchCandidate)
    private readonly wireRepo: Repository<WireMatchCandidate>
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async handle() {
    try {
      this.logger.debug('Running audit for unmatched wires older than 7 days...');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const unmatched = await this.wireRepo.find({
        where: {
          status: 'pending_review',
          resolvedProjectId: IsNull(),
          receivedAt: LessThan(cutoffDate),
        },
      });

      for (const wire of unmatched) {
        wire.status = 'flagged';
        await this.wireRepo.save(wire);
        this.logger.warn(`Stale unmatched wire flagged: ${wire.transactionId}`);
      }

      this.logger.log(`Audit complete. ${unmatched.length} wires flagged.`);
    } catch (err: any) {
      this.logger.warn(`Wire audit skipped: ${err.message}`);
    }
  }
}

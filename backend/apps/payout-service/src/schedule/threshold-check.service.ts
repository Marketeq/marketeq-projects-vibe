// apps/payout-service/src/schedule/threshold-check.service.ts
// PS-17 §5: Minimum balance threshold skip logic with consecutive-miss tracking.

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutSchedule } from '../entities/payout-schedule.entity';
import { PayoutPublisher } from '../publishers/payout.publisher';

@Injectable()
export class ThresholdCheckService {
  private readonly logger = new Logger(ThresholdCheckService.name);

  constructor(
    @InjectRepository(PayoutSchedule)
    private readonly scheduleRepo: Repository<PayoutSchedule>,
    private readonly publisher: PayoutPublisher,
  ) {}

  /**
   * PS-17 §5.2: Check if balance meets threshold. Returns { proceed: true } if OK.
   * On miss: increments consecutiveMissCount, notifies at every 3rd miss.
   */
  async checkThreshold(
    schedule: PayoutSchedule,
    availableBalanceUSD: number,
  ): Promise<{ proceed: boolean }> {
    const threshold = parseFloat(schedule.thresholdUsd ?? '50');

    // No threshold configured or balance meets threshold
    if (availableBalanceUSD >= threshold) {
      // Reset miss count on successful execution
      if (schedule.consecutiveMissCount > 0) {
        await this.scheduleRepo.update(schedule.id, { consecutiveMissCount: 0 });
      }
      return { proceed: true };
    }

    // Below threshold — increment miss count
    const newMissCount = (schedule.consecutiveMissCount ?? 0) + 1;

    await this.scheduleRepo.update(schedule.id, {
      consecutiveMissCount: newMissCount,
      lastSkippedAt: new Date(),
      lastSkipReason: 'BELOW_THRESHOLD',
    });

    this.logger.log(`Schedule ${schedule.id} skipped: balance $${availableBalanceUSD} < threshold $${threshold} (miss #${newMissCount})`);

    // PS-17 §5.2/§5.3, PS-23 §3.4: the real payout.scheduled.skipped event —
    // notifyContractor mirrors the "every 3rd miss" rule the log line below
    // already described, but this previously only published the generic
    // payout.schedule.updated (kept as-is, additive) and never the
    // dedicated skipped event notification-service's consumer expects.
    const notifyContractor = newMissCount % 3 === 0;
    if (notifyContractor) {
      this.logger.log(`Threshold miss notification for schedule ${schedule.id} (miss #${newMissCount})`);
      await this.publisher.publishScheduleUpdated({
        contractorId: schedule.contractorId,
        schedule: {
          event: 'threshold_miss',
          consecutiveMissCount: newMissCount,
          thresholdUSD: threshold,
          currentBalanceUSD: availableBalanceUSD,
        },
        updatedAt: new Date().toISOString(),
      });
    }

    await this.publisher.publishScheduledSkipped({
      scheduleId: schedule.id,
      contractorId: schedule.contractorId,
      frequency: schedule.frequency,
      skipReason: 'BELOW_THRESHOLD',
      thresholdUSD: threshold,
      currentBalanceUSD: availableBalanceUSD,
      consecutiveMissCount: newMissCount,
      notifyContractor,
      nextExecutionAt: schedule.nextExecutionAt?.toISOString() ?? new Date().toISOString(),
    });

    return { proceed: false };
  }
}
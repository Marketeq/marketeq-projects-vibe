// apps/payout-service/src/schedule/schedule-verification-pause.service.ts
// G9: scheduled automatic payouts and the verification gate.
//
// A schedule whose contractor's gate is closed is PAUSED - never cancelled,
// deleted or edited: pausedAt + pause_reason='verification_required' are the only
// columns written, so frequency, method, split, threshold, reserve and cadence
// survive untouched and the contractor never has to set anything up again. Only
// schedules carrying exactly that reason are resumed when the gate reopens; a
// schedule paused or disabled for any other reason is never touched here.
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PayoutSchedule } from '../entities/payout-schedule.entity';
import { DepositMethod } from '../entities/deposit-method.entity';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';
import { PayoutNotificationPublisher } from '../publishers/payout-notification.publisher';
import { NextExecutionService } from './next-execution.service';

export const PAUSE_REASON_VERIFICATION = 'verification_required';

export const SCHEDULED_PAYOUT_PAUSED_MESSAGE =
  'Your scheduled payout did not run because account verification is required.';

@Injectable()
export class ScheduleVerificationPauseService {
  private readonly logger = new Logger(ScheduleVerificationPauseService.name);

  constructor(
    @InjectRepository(PayoutSchedule) private readonly scheduleRepo: Repository<PayoutSchedule>,
    @InjectRepository(DepositMethod) private readonly methodRepo: Repository<DepositMethod>,
    private readonly nextExecution: NextExecutionService,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
    private readonly notifications: PayoutNotificationPublisher,
  ) {}

  /**
   * Pauses one schedule because its gate is closed. The write is conditional on the
   * schedule not already being paused, so concurrent or repeated scheduler runs
   * change the row exactly once - and the notification is sent only by the run that
   * changed it: one notification per paused condition, however many ticks follow.
   * Returns whether THIS call paused it.
   */
  async pauseForVerification(schedule: Pick<PayoutSchedule, 'id' | 'contractorId'>): Promise<boolean> {
    const pausedAt = new Date();
    const result = await this.scheduleRepo.update(
      { id: schedule.id, isActive: true, pausedAt: IsNull() },
      { pausedAt, pauseReason: PAUSE_REASON_VERIFICATION, pauseNotifiedAt: null },
    );
    if (!result.affected) return false;

    await this.auditService.log({
      contractorId: schedule.contractorId,
      actorType: 'service',
      actorId: 'schedule-execution-cron',
      action: 'schedule.paused_verification_required',
      metadata: { scheduleId: schedule.id },
    });
    await this.publisher.publishPayoutsPaused(schedule.contractorId, {
      reason: PAUSE_REASON_VERIFICATION,
      scheduleId: schedule.id,
      message: SCHEDULED_PAYOUT_PAUSED_MESSAGE,
    });
    this.logger.warn(`Schedule ${schedule.id} paused: account verification required`);
    await this.notifyPaused({ id: schedule.id, contractorId: schedule.contractorId, pausedAt });
    return true;
  }

  /**
   * Hands the user-facing notification to notification-service (see
   * PayoutNotificationPublisher) and records that the broker accepted it. Never throws
   * and never touches the pause: a failure leaves pause_notified_at NULL for the retry
   * sweep. The idempotency key is the pause itself, so a repeat (sweep, concurrent
   * worker, redelivery) is dropped by notification-service.
   */
  private async notifyPaused(s: { id: string; contractorId: string; pausedAt: Date }): Promise<void> {
    const accepted = await this.notifications.schedulePausedForVerification({ id: s.id, contractorId: s.contractorId }, s.pausedAt);
    if (!accepted) return;
    await this.scheduleRepo
      .update({ id: s.id, pauseReason: PAUSE_REASON_VERIFICATION, pausedAt: s.pausedAt }, { pauseNotifiedAt: new Date() })
      .catch((err) => this.logger.warn(`Could not record the notification for schedule ${s.id}: ${err instanceof Error ? err.message : err}`));
  }

  /** Re-publishes the notification of verification pauses whose first hand-off failed. */
  async retryPendingNotifications(limit = 100): Promise<number> {
    const pending = await this.scheduleRepo.find({
      where: { pauseReason: PAUSE_REASON_VERIFICATION, pauseNotifiedAt: IsNull(), isActive: true },
      take: limit,
    });
    let sent = 0;
    for (const s of pending) {
      if (!s.pausedAt) continue;
      await this.notifyPaused({ id: s.id, contractorId: s.contractorId, pausedAt: s.pausedAt });
      sent += 1;
    }
    return sent;
  }

  /**
   * Resumes every schedule of this contractor that was paused for verification, and
   * only those. The cadence is preserved: a due date that has already passed while
   * paused is moved to the NEXT configured occurrence, so resuming never triggers an
   * immediate catch-up payout; a due date still in the future is kept as it is.
   * Idempotent - a repeat finds nothing left to resume. Returns how many resumed.
   */
  async resumeForVerification(contractorId: string): Promise<number> {
    const paused = await this.scheduleRepo.find({
      where: { contractorId, pauseReason: PAUSE_REASON_VERIFICATION, isActive: true },
    });
    let resumed = 0;
    for (const schedule of paused) {
      if (!schedule.pausedAt) continue;
      const now = new Date();
      let next = schedule.nextExecutionAt;
      if (!next || next <= now) {
        const method = schedule.primaryMethodId
          ? await this.methodRepo.findOne({ where: { id: schedule.primaryMethodId } })
          : null;
        next = this.nextExecution.calculateNext(
          schedule.frequency,
          schedule.dayOfWeek,
          schedule.dayOfMonth,
          schedule.anchorDate ?? schedule.createdAt,
          method?.methodType ?? null,
          now,
          schedule.customIntervalDays,
          method?.bankCountry,
        );
      }
      // Conditional on the reason still being ours: a schedule that was meanwhile
      // paused for something else, or already resumed, is not touched.
      const result = await this.scheduleRepo.update(
        { id: schedule.id, pauseReason: PAUSE_REASON_VERIFICATION },
        { pausedAt: null, pauseReason: null, pauseNotifiedAt: null, nextExecutionAt: next, nextRunAt: next },
      );
      if (!result.affected) continue;
      resumed += 1;
      await this.auditService.log({
        contractorId,
        actorType: 'service',
        actorId: 'identity-gate-consumer',
        action: 'schedule.resumed_verification_cleared',
        metadata: { scheduleId: schedule.id, nextExecutionAt: next.toISOString() },
      });
      this.logger.log(`Schedule ${schedule.id} resumed: account verification cleared`);
    }
    return resumed;
  }
}

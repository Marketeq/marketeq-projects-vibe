// apps/payout-service/src/schedule/schedule-execution.cron.ts
// PS-17 v2.0 + PS-18: Deposit Schedule Execution Engine with auto-balance split
// Master cron fires every 30 minutes, evaluates all due schedules,
// runs pre-flight gates, executes split payouts using PS-18 calculator.
//
// PS-17 v2.0 §2/§6: dayOfWeek/dayOfMonth means the ARRIVAL day for ACH
// methods and the INITIATION day for everything else, and the Mon-Fri
// 06:00-22:00 UTC execution window (plus weekend/holiday deferral) applies
// to ACH only — Wise/Payoneer/Crypto initiate on the configured day
// regardless of window, weekend, or holiday. NextExecutionService already
// bakes the correct initiation date into nextExecutionAt, so this file only
// needs to gate ACH's execution *window* (a same-day time-of-day + weekend/
// holiday check) — not re-derive the initiation date itself.

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThanOrEqual, DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

import { PayoutSchedule } from '../entities/payout-schedule.entity';
import { PayoutRequest, PayoutStatus, PayoutTrigger } from '../entities/payout-request.entity';
import { DepositMethod, VerificationStatus, MethodType } from '../entities/deposit-method.entity';
import { SplitCalculatorService } from './split-calculator.service';
import { ThresholdCheckService } from './threshold-check.service';
import { NextExecutionService, isAchMethod } from './next-execution.service';
import { AchInitiationCalculatorService } from './ach-initiation-calculator.service';
import { PauseStatusService } from '../pause/pause-status.service';
import { EarningsClient } from '../common/earnings.client';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';
import { PayoutService } from '../payout/payout.service';
import { KycGateService } from '../kyc/kyc-gate.service';

const CONCURRENCY_CAP = 50;
const LOCK_TTL_MS = 25 * 60 * 1000; // 25 minutes

// PS-17 v2.0 §11.4: secondary retry schedule — immediate (already the first
// attempt, inline in executeSplit), then +5 minutes, then +30 minutes after
// that. After 3 total attempts: give up, notify, alert finance.
const SECONDARY_RETRY_DELAYS_MS = [5 * 60 * 1000, 30 * 60 * 1000];
const MAX_SECONDARY_ATTEMPTS = 3;

interface SecondaryRetryJob {
  scheduleId: string;
  secondaryMethodId: string;
  amountUSD: number;
  attempt: number; // 1-indexed; this job runs the (attempt)th retry, i.e. overall attempt (attempt+1)
}

@Injectable()
@Processor({ name: 'schedule-secondary-retry' })
export class ScheduleExecutionCron {
  private readonly logger = new Logger(ScheduleExecutionCron.name);
  private readonly redis: Redis;

  constructor(
    @InjectRepository(PayoutSchedule)
    private readonly scheduleRepo: Repository<PayoutSchedule>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly splitCalculator: SplitCalculatorService,
    private readonly thresholdCheck: ThresholdCheckService,
    private readonly nextExecService: NextExecutionService,
    private readonly achCalculator: AchInitiationCalculatorService,
    private readonly pauseStatusService: PauseStatusService,
    private readonly earningsClient: EarningsClient,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
    private readonly payoutService: PayoutService,
    private readonly kycGateService: KycGateService,
    @InjectQueue('schedule-secondary-retry') private readonly retryQueue: Queue,
  ) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'));
  }

  // ─── PS-17 v2.0 §4: Master cron — every 30 minutes ─────────
  @Cron('0,30 * * * *')
  async runScheduledPayouts(): Promise<void> {
    const lockKey = 'schedule:execution:lock';
    const lockAcquired = await this.redis.set(lockKey, 'locked', 'PX', LOCK_TTL_MS, 'NX');

    if (!lockAcquired) {
      this.logger.warn('Schedule execution already running — skipping tick');
      return;
    }

    const startTime = Date.now();
    try {
      const dueRaw = await this.scheduleRepo.find({
        where: {
          isActive: true,
          pausedAt: IsNull(),
          nextExecutionAt: LessThanOrEqual(new Date()),
        },
      });

      // US-72: a custom schedule's optional start/end date window — skip
      // (not deactivate) schedules whose window hasn't opened yet, and
      // deactivate ones whose window has closed so they stop coming up as
      // due every tick.
      const now = new Date();
      const due: PayoutSchedule[] = [];
      for (const schedule of dueRaw) {
        if (schedule.startDate && schedule.startDate > now) continue;
        if (schedule.endDate && schedule.endDate < now) {
          schedule.isActive = false;
          await this.scheduleRepo.save(schedule);
          continue;
        }
        due.push(schedule);
      }

      this.logger.log(`Schedule tick: ${due.length} schedules due`);

      const batches = this.chunk(due, CONCURRENCY_CAP);
      for (const batch of batches) {
        await Promise.allSettled(
          batch.map(schedule => this.processSchedule(schedule)),
        );
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(`Schedule tick complete: ${due.length} processed in ${elapsed}ms`);

      if (elapsed > 20 * 60 * 1000) {
        this.logger.error(`Schedule tick exceeded 20-minute alert threshold: ${elapsed}ms`);
      }
    } catch (err: any) {
      this.logger.error(`Schedule execution error: ${err.message}`);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  // ─── PS-17 v2.0 §6 / PS-34 §7: Execution window check — US ACH only ──
  // Non-ACH methods (Wise, Payoneer, Crypto) run 24/7 and are never gated by
  // this window — they initiate exactly on their configured day regardless
  // of time, weekend, or US federal holiday. International BANK_MANUAL
  // (Stripe cross-border or Wise Platform) is in the same boat — Wise
  // Platform runs 24/7 and Stripe's cross-border rail processes weekends —
  // so only true domestic ACH (BANK_STRIPE, or BANK_MANUAL/US) is windowed.
  private isWithinExecutionWindow(now: Date, methodType: MethodType, bankCountry?: string | null): boolean {
    if (!isAchMethod(methodType, bankCountry)) return true;

    const day = now.getUTCDay();
    const hour = now.getUTCHours();
    if (day === 0 || day === 6) return false; // weekend
    if (this.achCalculator.isHoliday(now)) return false; // US federal holiday
    return hour >= 6 && hour < 22;
  }

  // ─── PS-17 v2.0 §7 + PS-18: Process single schedule ────────
  private async processSchedule(schedule: PayoutSchedule): Promise<void> {
    try {
      // Check 1: primary method resolvable, active, verified — needed before
      // the window check below since the window only applies to ACH.
      const primaryMethod = schedule.primaryMethodId
        ? await this.methodRepo.findOne({ where: { id: schedule.primaryMethodId, isActive: true } })
        : null;

      if (!primaryMethod || primaryMethod.verificationStatus !== VerificationStatus.VERIFIED) {
        this.logger.log(`Schedule ${schedule.id} skipped — primary method not available`);
        await this.nextExecService.advanceNextExecution(schedule, primaryMethod?.methodType ?? null, primaryMethod?.bankCountry);
        return;
      }

      // PS-09 v2.0 §11 / PS-17 v2.0 §7 gate 4: reauthRequired blocks payouts
      // to this method until the contractor re-authorizes.
      if ((primaryMethod as any).reauthRequired) {
        this.logger.log(`Schedule ${schedule.id} skipped — primary method needs re-authorization`);
        await this.publisher.publishPayoutsPaused(schedule.contractorId, {
          reason: 'primary_method_reauth_required', depositMethodId: primaryMethod.id,
        });
        await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
        return;
      }

      // Check 1b (PS-15): same KYC/suspension/first-payout-hold gate the
      // manual withdrawal path enforces via PayoutService.initiate() — the
      // scheduler must not pay out a suspended contractor, one still under
      // the first-payout hold, or a method that hasn't cleared Tier 3 bank
      // ownership. checkGate() throws PayoutError on suspension/service-down;
      // treat any block (thrown or returned allowed:false) as a skip, not a
      // hard failure — retried on the next tick, same as the other gates.
      try {
        const gate = await this.kycGateService.checkGate(schedule.contractorId, primaryMethod.id);
        if (!gate.allowed) {
          this.logger.log(`Schedule ${schedule.id} skipped — KYC gate blocked (${gate.blockedBy})`);
          await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
          return;
        }
      } catch (err: any) {
        this.logger.log(`Schedule ${schedule.id} skipped — KYC gate blocked (${err.errorCode ?? err.message})`);
        await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
        return;
      }

      // Check 2: execution window (ACH only). Outside window = deferred to
      // the next window open, NOT the next scheduled frequency date — leave
      // nextExecutionAt untouched so the next tick re-evaluates it.
      if (!this.isWithinExecutionWindow(new Date(), primaryMethod.methodType, primaryMethod.bankCountry)) {
        this.logger.log(`Schedule ${schedule.id} deferred — outside ACH execution window`);
        return;
      }

      // Check 3: Pause conditions (PS-16)
      try {
        await this.pauseStatusService.assertNotPaused(schedule.contractorId);
      } catch {
        this.logger.log(`Schedule ${schedule.id} skipped — payouts paused`);
        await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
        return;
      }

      // Check 4: Get balance and check threshold
      let balanceUSD = 0;
      try {
        const balance = await this.earningsClient.getBalance(schedule.contractorId);
        balanceUSD = parseFloat(balance?.availableBalance ?? '0');
      } catch {
        this.logger.warn(`Schedule ${schedule.id} skipped — earnings service unavailable`);
        await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
        return;
      }

      const thresholdResult = await this.thresholdCheck.checkThreshold(schedule, balanceUSD);
      if (!thresholdResult.proceed) {
        await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
        return;
      }

      // Calculate payout amount (balance - reserve)
      const reserveUSD = parseFloat(schedule.reserveUsd ?? '0');
      const payoutUSD = balanceUSD - reserveUSD;
      if (payoutUSD <= 0) {
        this.logger.log(`Schedule ${schedule.id} skipped — payout amount $${payoutUSD} after reserve`);
        await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
        return;
      }

      // PS-18: Use splitEnabled flag
      if (schedule.splitEnabled && schedule.secondaryMethodId) {
        await this.executeSplit(schedule, payoutUSD, primaryMethod);
      } else {
        const result = await this.executeSinglePayout(schedule, primaryMethod, payoutUSD, 'primary');
        await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
        await this.scheduleRepo.update(schedule.id, { consecutiveMissCount: 0 });

        // PS-17 §7, PS-23 §3.5: dedicated event on successful execution —
        // notification-service/analytics-service's spec'd consumer.
        if (result.status !== 'failed' && result.payoutRequestId) {
          await this.publisher.publishScheduleCompleted({
            contractorId: schedule.contractorId,
            scheduleId: schedule.id,
            payoutRequestId: result.payoutRequestId,
            amountUsd: payoutUSD,
          });
        }
      }

      await this.auditService.log({
        contractorId: schedule.contractorId,
        actorType: 'service',
        actorId: 'schedule-execution-cron',
        action: 'schedule.executed',
        metadata: { scheduleId: schedule.id, payoutUSD, frequency: schedule.frequency },
      });

    } catch (err: any) {
      this.logger.error(`Schedule ${schedule.id} execution failed: ${err.message}`);
      // Best-effort: advance without a method type rather than leaving
      // nextExecutionAt stale forever if something above threw unexpectedly.
      await this.nextExecService.advanceNextExecution(schedule, null);
    }
  }

  // ─── PS-17 v2.0 §10 + PS-18 §4.2: Split payout execution ───
  private async executeSplit(
    schedule: PayoutSchedule,
    totalUSD: number,
    primaryMethod: DepositMethod,
  ): Promise<void> {
    // PS-18 §4.2: Use SplitCalculatorService for precise rounding
    const psp = parseFloat(String(schedule.primarySplitPercent));
    const { primaryUSD, secondaryUSD } = this.splitCalculator.splitAmount(totalUSD, psp);

    // Step 1: Execute primary
    const primaryResult = await this.executeSinglePayout(schedule, primaryMethod, primaryUSD, 'primary');
    if (primaryResult.status === 'failed') {
      // PS-17 v2.0 §11.1: primary fails before secondary is attempted —
      // no debit occurred, retry primary on next scheduled cycle,
      // consecutiveMissCount NOT incremented.
      this.logger.error(`Split: primary failed for schedule ${schedule.id}`);
      await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
      return;
    }

    // Step 2: Check secondary method status (PS-18 §7.1 REAUTH_REQUIRED)
    const secondaryMethod = await this.methodRepo.findOne({ where: { id: schedule.secondaryMethodId! } });
    if (!secondaryMethod || !secondaryMethod.isActive) {
      this.logger.warn(`Split: secondary method ${schedule.secondaryMethodId} inactive — primary got full amount`);
      await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
      await this.scheduleRepo.update(schedule.id, { consecutiveMissCount: 0 });
      return;
    }

    if (secondaryMethod.verificationStatus !== VerificationStatus.VERIFIED || secondaryMethod.reauthRequired) {
      // PS-18 §7.1: REAUTH_REQUIRED — skip secondary, primary already executed at its split portion
      this.logger.warn(`Split: secondary method needs reauth — skipping secondary for schedule ${schedule.id}`);
      await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
      await this.scheduleRepo.update(schedule.id, { consecutiveMissCount: 0 });
      return;
    }

    // PS-15: gate the secondary method too — Tier 3 bank ownership is
    // method-scoped, so a verified primary doesn't clear an unverified
    // secondary. Primary already executed at this point and is NOT reversed.
    try {
      const secondaryGate = await this.kycGateService.checkGate(schedule.contractorId, secondaryMethod.id);
      if (!secondaryGate.allowed) {
        this.logger.warn(`Split: secondary KYC gate blocked (${secondaryGate.blockedBy}) — skipping secondary for schedule ${schedule.id}`);
        await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
        await this.scheduleRepo.update(schedule.id, { consecutiveMissCount: 0 });
        return;
      }
    } catch (err: any) {
      this.logger.warn(`Split: secondary KYC gate blocked (${err.errorCode ?? err.message}) — skipping secondary for schedule ${schedule.id}`);
      await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
      await this.scheduleRepo.update(schedule.id, { consecutiveMissCount: 0 });
      return;
    }

    // Execute secondary — attempt 1 of PS-17 v2.0 §11.4's 3-attempt schedule.
    const secondaryResult = await this.executeSinglePayout(schedule, secondaryMethod, secondaryUSD, 'secondary');
    if (secondaryResult.status === 'failed') {
      // PS-17 v2.0 §11.2: Primary is NOT reversed. Secondary retried
      // independently — queue attempt 2 for 5 minutes from now.
      this.logger.warn(`Split: secondary failed for schedule ${schedule.id} — primary NOT reversed, queuing retry`);
      await this.queueSecondaryRetry({
        scheduleId: schedule.id,
        secondaryMethodId: secondaryMethod.id,
        amountUSD: secondaryUSD,
        attempt: 1,
      });
      await this.auditService.log({
        contractorId: schedule.contractorId,
        actorType: 'service', actorId: 'schedule-execution-cron',
        action: 'schedule.partial_failure',
        metadata: { scheduleId: schedule.id, primaryUSD, secondaryUSD, secondaryMethodId: secondaryMethod.id },
      });

      // PS-17 §8.3, PS-23 §3.5: dedicated event, additive to the audit log
      // above — notification-service/finance-service's spec'd consumer.
      await this.publisher.publishSchedulePartialFailure({
        contractorId: schedule.contractorId,
        scheduleId: schedule.id,
        splitGroupId: schedule.id,
        succeededPayoutIds: primaryResult.payoutRequestId ? [primaryResult.payoutRequestId] : [],
        failedPayoutIds: secondaryResult.payoutRequestId ? [secondaryResult.payoutRequestId] : [],
      });
    }

    await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
    await this.scheduleRepo.update(schedule.id, { consecutiveMissCount: 0 });
  }

  // ─── PS-17 v2.0 §11.4: Secondary retry queueing + handler ──
  private async queueSecondaryRetry(job: SecondaryRetryJob): Promise<void> {
    const delay = SECONDARY_RETRY_DELAYS_MS[job.attempt - 1] ?? null;
    if (delay === null) return; // attempts exhausted — handled by the caller
    await this.retryQueue.add('retry-secondary', job, { delay, attempts: 1, removeOnComplete: true });
  }

  // Bull processor for the delayed secondary-retry queue. Re-checks the
  // secondary method is still usable, re-attempts the payout, and either
  // succeeds, queues the next attempt, or — after MAX_SECONDARY_ATTEMPTS —
  // gives up and alerts finance (PS-17 v2.0 §11.4 attempt 3 outcome).
  @Process('retry-secondary')
  async handleSecondaryRetry(job: Job<SecondaryRetryJob>): Promise<void> {
    const { scheduleId, secondaryMethodId, amountUSD, attempt } = job.data;
    const overallAttempt = attempt + 1;

    const schedule = await this.scheduleRepo.findOne({ where: { id: scheduleId } });
    if (!schedule || !schedule.isActive) {
      this.logger.warn(`Secondary retry for schedule ${scheduleId} skipped — schedule inactive/missing`);
      return;
    }

    const secondaryMethod = await this.methodRepo.findOne({ where: { id: secondaryMethodId, isActive: true } });
    if (!secondaryMethod || secondaryMethod.verificationStatus !== VerificationStatus.VERIFIED || secondaryMethod.reauthRequired) {
      this.logger.warn(`Secondary retry ${overallAttempt} for schedule ${scheduleId} aborted — method no longer usable`);
      await this.giveUpOnSecondary(schedule, secondaryMethodId, amountUSD, overallAttempt);
      return;
    }

    const result = await this.executeSinglePayout(schedule, secondaryMethod, amountUSD, 'secondary');
    if (result.status !== 'failed') {
      this.logger.log(`Secondary retry ${overallAttempt} for schedule ${scheduleId} succeeded`);
      return;
    }

    if (overallAttempt >= MAX_SECONDARY_ATTEMPTS) {
      await this.giveUpOnSecondary(schedule, secondaryMethodId, amountUSD, overallAttempt);
      return;
    }

    this.logger.warn(`Secondary retry ${overallAttempt} for schedule ${scheduleId} failed — queuing attempt ${overallAttempt + 1}`);
    await this.queueSecondaryRetry({ scheduleId, secondaryMethodId, amountUSD, attempt: attempt + 1 });
  }

  // PS-17 v2.0 §11.4 attempt 3 outcome: stop retrying, publish
  // payout.secondary.failed for finance alert. The secondary amount stays
  // in the contractor's earnings balance (never held, since every attempt's
  // failure runs through failPayout()/publishPayoutFailed(), which restores
  // it) until manual reprocessing.
  private async giveUpOnSecondary(
    schedule: PayoutSchedule, secondaryMethodId: string, amountUSD: number, overallAttempt: number,
  ): Promise<void> {
    this.logger.error(
      `Secondary payout for schedule ${schedule.id} failed after ${overallAttempt} attempts — ` +
      `finance alert required (secondary method ${secondaryMethodId}, $${amountUSD})`,
    );
    await this.auditService.log({
      contractorId: schedule.contractorId,
      actorType: 'service', actorId: 'schedule-execution-cron',
      action: 'schedule.secondary.failed',
      metadata: { scheduleId: schedule.id, secondaryMethodId, amountUSD, attempts: overallAttempt, requiresManualReview: true },
    });

    // PS-17 §8.4, PS-23 §3.5: dedicated event, additive to the audit log
    // above — finance-service's spec'd alert-queue consumer.
    await this.publisher.publishSecondaryFailed({
      contractorId: schedule.contractorId,
      scheduleId: schedule.id,
      payoutRequestId: `schedule-secondary-${schedule.id}-${secondaryMethodId}`,
      splitGroupId: schedule.id,
      reason: `Secondary payout failed after ${overallAttempt} attempts — manual review required.`,
    });
  }

  // ─── Execute single method payout ──────────────────────────
  // PS-17 v2.0 §9/§12: places the balance hold and enqueues the payout for
  // real execution via the existing 'payout-processing' Bull queue — the
  // same queue and executor dispatch manual withdrawals use. Previously
  // this only created a QUEUED payout_requests row with no balance hold and
  // nothing that ever pushed it onto that queue, so scheduled payouts were
  // created but never actually executed or debited (see the removed
  // comment on this method — confirmed no other code path enqueued these).
  private async executeSinglePayout(
    schedule: PayoutSchedule,
    method: DepositMethod,
    amountUSD: number,
    splitRole: 'primary' | 'secondary',
  ): Promise<{ status: string; payoutRequestId?: string }> {
    const amountStr = amountUSD.toFixed(8);

    // Instant hold — mirrors PayoutService.verifyMagicLink's manual-
    // withdrawal path: debit available_balance before the payout_requests
    // row is created, so a hold failure (race with another concurrent
    // withdrawal, insufficient balance since the fresh read above) fails
    // the attempt instead of creating a row backed by nothing.
    const held = await this.earningsClient.holdBalance(schedule.contractorId, amountStr);
    if (!held) {
      this.logger.warn(`Scheduled payout hold failed for schedule ${schedule.id} [${splitRole}] — insufficient balance`);
      return { status: 'failed' };
    }

    try {
      const payout = await this.dataSource.transaction(async (em) => {
        const request = em.create(PayoutRequest, {
          contractorId: schedule.contractorId,
          depositMethodId: method.id,
          amountUsd: amountStr,
          feeUsd: '0.00000000',
          netAmountUsd: amountStr,
          currency: 'USD',
          trigger: PayoutTrigger.SCHEDULED,
          status: PayoutStatus.QUEUED,
          idempotencyKey: `schedule:${schedule.id}:${splitRole}:${Date.now()}`,
          queuedAt: new Date(),
          splitGroupId: schedule.id,
          splitSequence: splitRole === 'primary' ? 1 : 2,
        });
        return em.save(request);
      });

      await this.payoutService.enqueueForProcessing(payout.id);

      this.logger.log(`Scheduled payout created: ${payout.id} ($${amountUSD}) → ${method.displayLabel} [${splitRole}]`);
      return { status: 'queued', payoutRequestId: payout.id };

    } catch (err: any) {
      this.logger.error(`Scheduled payout failed: ${err.message}`);
      // The row (if any) failed to persist/enqueue after the hold already
      // succeeded — restore the balance rather than leaving funds stuck in
      // pending_hold with nothing to ever release them via the normal
      // payout.completed/payout.failed webhook path.
      await this.publisher.publishPayoutFailed({
        contractorId: schedule.contractorId,
        payoutRequestId: `schedule-hold-${schedule.id}-${Date.now()}`,
        amount: amountStr,
        currency: 'USD',
        methodType: method.methodType,
        reason: 'Failed to create or enqueue the scheduled payout after the balance hold succeeded.',
        failedAt: new Date().toISOString(),
      });
      return { status: 'failed' };
    }
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}

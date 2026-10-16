// apps/payout-service/src/schedule/schedule-execution.cron.ts
// PS-17 v2.0 + PS-18: Deposit Schedule Execution Engine with auto-balance split
// Master cron fires every 30 minutes, evaluates all due schedules,
// runs pre-flight gates, executes split payouts using PS-18 calculator.
//
// PS-17 v2.0 §2/§6: dayOfWeek/dayOfMonth means the ARRIVAL day for ACH
// methods and the INITIATION day for everything else, and the Mon-Fri
// 06:00-22:00 UTC execution window (plus weekend/holiday deferral) applies
// to ACH only — Wise/Crypto initiate on the configured day
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
import { createHash } from 'crypto';
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
import { PayoutExecutionGate } from '../identity-gate/payout-execution-gate.service';
import { ScheduleVerificationPauseService } from './schedule-verification-pause.service';

const CONCURRENCY_CAP = 50;
const LOCK_TTL_MS = 25 * 60 * 1000; // 25 minutes

// PS-17 v2.0 §11.4: secondary retry schedule — immediate (already the first
// attempt, inline in executeSplit), then +5 minutes, then +30 minutes after
// that. After 3 total attempts: give up, notify, alert finance.
const SECONDARY_RETRY_DELAYS_MS = [5 * 60 * 1000, 30 * 60 * 1000];
const MAX_SECONDARY_ATTEMPTS = 3;

// A secondary retry whose verification gate could not be answered is queued again (same attempt,
// nothing was paid) at most this many times before finance is alerted.
const MAX_SECONDARY_GATE_WAITS = 12;

interface SecondaryRetryJob {
  scheduleId: string;
  secondaryMethodId: string;
  amountUSD: number;
  attempt: number; // 1-indexed; this job runs the (attempt)th retry, i.e. overall attempt (attempt+1)
  // The due occurrence (ISO nextExecutionAt) the split belongs to. Part of every payout's
  // idempotency key, so a redelivered or restarted job cannot pay the same leg twice.
  occurrence?: string;
  gateWaits?: number;
}

type LegResult = {
  status: 'queued' | 'failed' | 'blocked' | 'exists';
  payoutRequestId?: string;
  // 'exists': the status of the leg's payout row created by an earlier pass.
  legStatus?: PayoutStatus;
  amountUsd?: string;
  // 'blocked': closed = the schedule was paused; unavailable = nothing happened, retry later.
  reason?: 'closed' | 'unavailable';
};

/**
 * One deterministic id per payment leg: the same schedule occurrence, role and attempt always
 * produce the same value, across retries, queue redeliveries, process restarts and concurrent
 * workers. payout_requests.idempotency_key is UNIQUE, so the database itself refuses a second
 * row for a leg that already exists. Formatted as a UUID because that column is a UUID in the
 * reference schema (001_initial_schema.sql).
 */
export function legIdempotencyKey(scheduleId: string, occurrence: string, role: string): string {
  const h = createHash('sha256').update(`schedule-leg:${scheduleId}:${occurrence}:${role}`).digest('hex');
  const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

function isUniqueViolation(err: any): boolean {
  return err?.code === '23505' || err?.driverError?.code === '23505';
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
    private readonly executionGate: PayoutExecutionGate,
    private readonly verificationPause: ScheduleVerificationPauseService,
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
      // G9: a verification pause whose notification could not be handed to the broker
      // at the moment of pausing is re-published (same idempotency key: no duplicate).
      await this.verificationPause.retryPendingNotifications().catch((err) =>
        this.logger.warn(`Pending pause notifications not retried: ${err.message}`));

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
  // Non-ACH methods (Wise, Crypto) run 24/7 and are never gated by
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

      // A split occurrence whose primary leg was already created resumes at its unfinished leg.
      // The balance/threshold checks below are deliberately skipped: the primary's hold has
      // already reduced the balance, and what is left may legitimately be under the threshold
      // or the reserve - that is the secondary leg's money, sized when the primary was created.
      if (this.splitInProgress(schedule)) {
        await this.executeSplit(schedule, 0, primaryMethod);
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
        const singleKey = legIdempotencyKey(schedule.id, schedule.nextExecutionAt ? schedule.nextExecutionAt.toISOString() : 'none', 'single');
        const result = await this.executeSinglePayout(schedule, primaryMethod, payoutUSD, 'primary', singleKey);
        // G9: blocked by the verification gate - paused (closed) or retried on the
        // next tick (unanswered); nothing ran, so nothing advances.
        if (result.status === 'blocked') return;
        await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
        await this.scheduleRepo.update(schedule.id, { consecutiveMissCount: 0 });

        // PS-17 §7, PS-23 §3.5: dedicated event on successful execution —
        // notification-service/analytics-service's spec'd consumer.
        if (result.status === 'queued' && result.payoutRequestId) {
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
  //
  // Each leg (primary, secondary) has a deterministic idempotency key built from the schedule and
  // the due occurrence (nextExecutionAt), so it can be created at most once no matter how often
  // this runs: the next tick after a crash, a queue redelivery, a second worker, or a retry after
  // the gate was unreachable between the two legs. A second pass finds the first leg's row and
  // RESUMES at the unfinished leg. The schedule only advances once the occurrence is finished.
  private async executeSplit(
    schedule: PayoutSchedule,
    totalUSD: number,
    primaryMethod: DepositMethod,
  ): Promise<void> {
    const occurrence = schedule.nextExecutionAt ?? null;
    const occurrenceKey = occurrence ? occurrence.toISOString() : 'none';
    const primaryKey = legIdempotencyKey(schedule.id, occurrenceKey, 'primary');
    const secondaryKey = legIdempotencyKey(schedule.id, occurrenceKey, 'secondary');

    // The secondary amount fixed when the primary leg was created for THIS occurrence, if any.
    const resumedPlan =
      occurrence && schedule.splitOccurrenceAt && schedule.splitSecondaryUsd != null &&
      new Date(schedule.splitOccurrenceAt).getTime() === occurrence.getTime()
        ? parseFloat(String(schedule.splitSecondaryUsd))
        : null;

    // PS-18 §4.2: Use SplitCalculatorService for precise rounding
    const psp = parseFloat(String(schedule.primarySplitPercent));
    const fresh = this.splitCalculator.splitAmount(totalUSD, psp);
    let primaryUSD = fresh.primaryUSD;
    let secondaryUSD = resumedPlan ?? fresh.secondaryUSD;

    // Step 1: Execute primary (or find that an earlier pass already did)
    const primaryResult = await this.executeSinglePayout(schedule, primaryMethod, primaryUSD, 'primary', primaryKey, {
      occurrence, secondaryUsd: secondaryUSD.toFixed(8),
    });
    if (primaryResult.status === 'blocked') return; // G9
    if (primaryResult.status === 'failed') {
      // PS-17 v2.0 §11.1: primary fails before secondary is attempted —
      // no debit occurred, retry primary on next scheduled cycle,
      // consecutiveMissCount NOT incremented.
      this.logger.error(`Split: primary failed for schedule ${schedule.id}`);
      await this.finishSplit(schedule, primaryMethod, false);
      return;
    }
    if (primaryResult.status === 'exists') {
      // The primary leg was already created for this occurrence - it is never paid again.
      primaryUSD = parseFloat(primaryResult.amountUsd ?? String(primaryUSD));
      if (primaryResult.legStatus === PayoutStatus.FAILED || primaryResult.legStatus === PayoutStatus.CANCELLED) {
        // Its hold was released with the failure; same outcome as a primary that failed outright.
        this.logger.warn(`Split: primary of schedule ${schedule.id} already ended ${primaryResult.legStatus} - occurrence closed`);
        await this.finishSplit(schedule, primaryMethod, false);
        return;
      }
      if (resumedPlan === null) {
        // Cannot size the secondary without the plan recorded with the primary: leave that part
        // of the balance where it is rather than guess an amount.
        this.logger.error(`Split: schedule ${schedule.id} resumed without a recorded secondary amount - secondary skipped`);
        await this.auditService.log({
          contractorId: schedule.contractorId, actorType: 'service', actorId: 'schedule-execution-cron',
          action: 'schedule.split_resume_unsized', metadata: { scheduleId: schedule.id, occurrence: occurrenceKey },
        });
        await this.finishSplit(schedule, primaryMethod, true);
        return;
      }
      this.logger.log(`Split: schedule ${schedule.id} resuming at the secondary leg (primary already created)`);
    }

    // Step 2: Check secondary method status (PS-18 §7.1 REAUTH_REQUIRED)
    const secondaryMethod = await this.methodRepo.findOne({ where: { id: schedule.secondaryMethodId! } });
    if (!secondaryMethod || !secondaryMethod.isActive) {
      this.logger.warn(`Split: secondary method ${schedule.secondaryMethodId} inactive — primary got full amount`);
      await this.finishSplit(schedule, primaryMethod, true);
      return;
    }

    if (secondaryMethod.verificationStatus !== VerificationStatus.VERIFIED || secondaryMethod.reauthRequired) {
      // PS-18 §7.1: REAUTH_REQUIRED — skip secondary, primary already executed at its split portion
      this.logger.warn(`Split: secondary method needs reauth — skipping secondary for schedule ${schedule.id}`);
      await this.finishSplit(schedule, primaryMethod, true);
      return;
    }

    // PS-15: gate the secondary method too — Tier 3 bank ownership is
    // method-scoped, so a verified primary doesn't clear an unverified
    // secondary. Primary already executed at this point and is NOT reversed.
    try {
      const secondaryGate = await this.kycGateService.checkGate(schedule.contractorId, secondaryMethod.id);
      if (!secondaryGate.allowed) {
        this.logger.warn(`Split: secondary KYC gate blocked (${secondaryGate.blockedBy}) — skipping secondary for schedule ${schedule.id}`);
        await this.finishSplit(schedule, primaryMethod, true);
        return;
      }
    } catch (err: any) {
      this.logger.warn(`Split: secondary KYC gate blocked (${err.errorCode ?? err.message}) — skipping secondary for schedule ${schedule.id}`);
      await this.finishSplit(schedule, primaryMethod, true);
      return;
    }

    // Execute secondary — attempt 1 of PS-17 v2.0 §11.4's 3-attempt schedule.
    const secondaryResult = await this.executeSinglePayout(schedule, secondaryMethod, secondaryUSD, 'secondary', secondaryKey);
    if (secondaryResult.status === 'blocked') {
      // G9: the verification gate was checked again right before this second payment.
      //  - closed: the schedule was paused and the secondary stays in the balance;
      //  - unanswered: nothing was paid and the schedule stays due, so the next tick comes back
      //    here, finds the primary already created, and retries only the secondary.
      // Either way the primary is never run again and the schedule is not advanced.
      return;
    }
    if (secondaryResult.status === 'failed') {
      // PS-17 v2.0 §11.2: Primary is NOT reversed. Secondary retried
      // independently — queue attempt 2 for 5 minutes from now.
      this.logger.warn(`Split: secondary failed for schedule ${schedule.id} — primary NOT reversed, queuing retry`);
      await this.queueSecondaryRetry({
        scheduleId: schedule.id,
        secondaryMethodId: secondaryMethod.id,
        amountUSD: secondaryUSD,
        attempt: 1,
        occurrence: occurrenceKey,
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

    await this.finishSplit(schedule, primaryMethod, true);
  }

  /** True when this due occurrence already has its primary leg (the plan was recorded with it). */
  private splitInProgress(schedule: PayoutSchedule): boolean {
    return !!(
      schedule.splitEnabled && schedule.secondaryMethodId &&
      schedule.nextExecutionAt && schedule.splitOccurrenceAt && schedule.splitSecondaryUsd != null &&
      new Date(schedule.splitOccurrenceAt).getTime() === new Date(schedule.nextExecutionAt).getTime()
    );
  }

  // The occurrence is finished (both legs created, or deliberately skipped): move the schedule on
  // and forget the recorded plan so the next occurrence sizes itself afresh.
  private async finishSplit(schedule: PayoutSchedule, primaryMethod: DepositMethod, resetMissCount: boolean): Promise<void> {
    await this.nextExecService.advanceNextExecution(schedule, primaryMethod.methodType, primaryMethod.bankCountry);
    await this.scheduleRepo.update(schedule.id, {
      ...(resetMissCount ? { consecutiveMissCount: 0 } : {}),
      splitOccurrenceAt: null,
      splitSecondaryUsd: null,
    });
  }

  // ─── PS-17 v2.0 §11.4: Secondary retry queueing + handler ──
  private async queueSecondaryRetry(job: SecondaryRetryJob): Promise<void> {
    const delay = SECONDARY_RETRY_DELAYS_MS[job.attempt - 1] ?? null;
    if (delay === null) return; // attempts exhausted — handled by the caller
    await this.retryQueue.add('retry-secondary', job, {
      delay, attempts: 1, removeOnComplete: true,
      // The same retry is never queued twice (e.g. a resumed occurrence).
      jobId: `retry-secondary:${job.scheduleId}:${job.occurrence ?? 'none'}:${job.attempt}:${job.gateWaits ?? 0}`,
    });
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

    // One key per (occurrence, attempt): a redelivered or restarted job finds its own payout row
    // and does nothing, so a retry can never pay the secondary twice.
    const key = legIdempotencyKey(scheduleId, job.data.occurrence ?? `job:${job.id}`, `secondary-retry-${attempt}`);
    const result = await this.executeSinglePayout(schedule, secondaryMethod, amountUSD, 'secondary', key);
    if (result.status === 'exists') {
      this.logger.log(`Secondary retry ${overallAttempt} for schedule ${scheduleId} already ran - not repeated`);
      return;
    }
    if (result.status === 'blocked') {
      if (result.reason === 'closed') return; // G9: gate closed - schedule paused, no further retries
      // The gate could not be answered: nothing was paid. Try this same attempt again later
      // instead of ending the chain silently; alert finance if the outage does not clear.
      const gateWaits = (job.data.gateWaits ?? 0) + 1;
      if (gateWaits > MAX_SECONDARY_GATE_WAITS) {
        await this.giveUpOnSecondary(schedule, secondaryMethodId, amountUSD, overallAttempt);
        return;
      }
      this.logger.warn(`Secondary retry ${overallAttempt} for schedule ${scheduleId}: verification unconfirmed - trying again later (${gateWaits})`);
      await this.queueSecondaryRetry({ ...job.data, gateWaits });
      return;
    }
    if (result.status !== 'failed') {
      this.logger.log(`Secondary retry ${overallAttempt} for schedule ${scheduleId} succeeded`);
      return;
    }

    if (overallAttempt >= MAX_SECONDARY_ATTEMPTS) {
      await this.giveUpOnSecondary(schedule, secondaryMethodId, amountUSD, overallAttempt);
      return;
    }

    this.logger.warn(`Secondary retry ${overallAttempt} for schedule ${scheduleId} failed — queuing attempt ${overallAttempt + 1}`);
    await this.queueSecondaryRetry({ scheduleId, secondaryMethodId, amountUSD, attempt: attempt + 1, occurrence: job.data.occurrence });
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
  // same queue and executor dispatch manual withdrawals use.
  //
  // `idempotencyKey` identifies this payment (see legIdempotencyKey): if a payout row with it
  // already exists the payment was already created by an earlier pass, and nothing is held,
  // created or enqueued again ('exists'). payout_requests.idempotency_key is UNIQUE, so two
  // workers racing for the same leg cannot both create it either.
  private async executeSinglePayout(
    schedule: PayoutSchedule,
    method: DepositMethod,
    amountUSD: number,
    splitRole: 'primary' | 'secondary',
    idempotencyKey: string,
    plan?: { occurrence: Date | null; secondaryUsd: string },
  ): Promise<LegResult> {
    const amountStr = amountUSD.toFixed(8);

    const already = await this.payoutRepo.findOne({ where: { idempotencyKey } });
    if (already) {
      return { status: 'exists', payoutRequestId: already.id, legStatus: already.status, amountUsd: already.amountUsd };
    }

    // G9: the verification gate, for the contractor on the schedule record,
    // immediately before this payout can move money (before the balance hold).
    // Closed: the schedule is paused (once, with one notification) and nothing is
    // held or created. Unanswered: nothing happens now and the next tick retries.
    const gate = await this.executionGate.evaluate(schedule.contractorId);
    if (gate.state === 'closed') {
      await this.verificationPause.pauseForVerification(schedule);
      return { status: 'blocked', reason: 'closed' };
    }
    if (gate.state === 'unavailable') {
      this.logger.warn(`Schedule ${schedule.id} not run: verification status could not be confirmed (will retry)`);
      return { status: 'blocked', reason: 'unavailable' };
    }

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

    let payout: PayoutRequest | undefined;
    try {
      payout = await this.dataSource.transaction(async (em) => {
        const request = em.create(PayoutRequest, {
          contractorId: schedule.contractorId,
          depositMethodId: method.id,
          amountUsd: amountStr,
          feeUsd: '0.00000000',
          netAmountUsd: amountStr,
          currency: 'USD',
          trigger: PayoutTrigger.SCHEDULED,
          status: PayoutStatus.QUEUED,
          idempotencyKey,
          queuedAt: new Date(),
          splitGroupId: schedule.id,
          splitSequence: splitRole === 'primary' ? 1 : 2,
        });
        const saved = await em.save(request);
        // The occurrence's plan is recorded in the same transaction as the first leg, so a
        // resumed occurrence never loses the amount the secondary leg was sized with.
        if (plan?.occurrence) {
          await em.update(PayoutSchedule, schedule.id, {
            splitOccurrenceAt: plan.occurrence,
            splitSecondaryUsd: plan.secondaryUsd,
          });
        }
        return saved;
      });

      await this.payoutService.enqueueForProcessing(payout.id);

      this.logger.log(`Scheduled payout created: ${payout.id} ($${amountUSD}) → ${method.displayLabel} [${splitRole}]`);
      return { status: 'queued', payoutRequestId: payout.id, amountUsd: amountStr };

    } catch (err: any) {
      this.logger.error(`Scheduled payout failed: ${err.message}`);
      // The hold above is released in every failure case: nothing else will release it.
      await this.publisher.publishPayoutFailed({
        contractorId: schedule.contractorId,
        payoutRequestId: `schedule-hold-${schedule.id}-${Date.now()}`,
        amount: amountStr,
        currency: 'USD',
        methodType: method.methodType,
        reason: 'Failed to create or enqueue the scheduled payout after the balance hold succeeded.',
        failedAt: new Date().toISOString(),
      });
      if (isUniqueViolation(err)) {
        // Another worker (or an earlier pass) created this very payment between our check and
        // our insert. It owns the payment; this extra hold was just released above.
        const winner = await this.payoutRepo.findOne({ where: { idempotencyKey } });
        return { status: 'exists', payoutRequestId: winner?.id, legStatus: winner?.status, amountUsd: winner?.amountUsd };
      }
      if (payout) {
        // The row was saved but could not be enqueued: its hold is released, so the row must not
        // look like a live payment that a resumed occurrence would treat as already handled.
        await this.payoutRepo.update(payout.id, {
          status: PayoutStatus.FAILED,
          failureReason: 'The scheduled payout could not be queued for processing.',
        }).catch((e: any) => this.logger.error(`Could not mark ${payout!.id} failed: ${e.message}`));
      }
      return { status: 'failed', payoutRequestId: payout?.id };
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

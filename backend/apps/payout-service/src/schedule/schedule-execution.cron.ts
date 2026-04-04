// apps/payout-service/src/schedule/schedule-execution.cron.ts
// PS-17 + PS-18: Deposit Schedule Execution Engine with auto-balance split
// Master cron fires every 30 minutes, evaluates all due schedules,
// runs pre-flight gates, executes split payouts using PS-18 calculator.

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThanOrEqual, DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

import { PayoutSchedule } from '../entities/payout-schedule.entity';
import { PayoutRequest, PayoutStatus, PayoutTrigger } from '../entities/payout-request.entity';
import { DepositMethod, VerificationStatus } from '../entities/deposit-method.entity';
import { SplitCalculatorService } from './split-calculator.service';
import { ThresholdCheckService } from './threshold-check.service';
import { NextExecutionService } from './next-execution.service';
import { PauseStatusService } from '../pause/pause-status.service';
import { EarningsClient } from '../common/earnings.client';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';

const CONCURRENCY_CAP = 50;
const LOCK_TTL_MS = 25 * 60 * 1000; // 25 minutes

@Injectable()
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
    private readonly pauseStatusService: PauseStatusService,
    private readonly earningsClient: EarningsClient,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
  ) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'));
  }

  // ─── PS-17 §2: Master cron — every 30 minutes ──────────────
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
      const due = await this.scheduleRepo.find({
        where: {
          isActive: true,
          pausedAt: IsNull(),
          nextExecutionAt: LessThanOrEqual(new Date()),
        },
      });

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

  // ─── PS-17 §3: Execution window check ──────────────────────
  private isWithinExecutionWindow(now: Date): boolean {
    const day = now.getUTCDay();
    const hour = now.getUTCHours();
    if (day === 0 || day === 6) return false;
    return hour >= 6 && hour < 22;
  }

  // ─── PS-17 §4 + PS-18: Process single schedule ────────────
  private async processSchedule(schedule: PayoutSchedule): Promise<void> {
    try {
      if (!this.isWithinExecutionWindow(new Date())) {
        this.logger.log(`Schedule ${schedule.id} deferred — outside execution window`);
        return;
      }

      // Check 1: Pause conditions
      try {
        await this.pauseStatusService.assertNotPaused(schedule.contractorId);
      } catch {
        this.logger.log(`Schedule ${schedule.id} skipped — payouts paused`);
        await this.nextExecService.advanceNextExecution(schedule);
        return;
      }

      // Check 2: Primary method active and verified
      const primaryMethod = schedule.primaryMethodId
        ? await this.methodRepo.findOne({ where: { id: schedule.primaryMethodId, isActive: true } })
        : null;

      if (!primaryMethod || primaryMethod.verificationStatus !== VerificationStatus.VERIFIED) {
        this.logger.log(`Schedule ${schedule.id} skipped — primary method not available`);
        await this.nextExecService.advanceNextExecution(schedule);
        return;
      }

      // Check 3: Get balance and check threshold
      let balanceUSD = 0;
      try {
        const balance = await this.earningsClient.getBalance(schedule.contractorId);
        balanceUSD = parseFloat(balance?.availableBalance ?? '0');
      } catch {
        this.logger.warn(`Schedule ${schedule.id} skipped — earnings service unavailable`);
        await this.nextExecService.advanceNextExecution(schedule);
        return;
      }

      const thresholdResult = await this.thresholdCheck.checkThreshold(schedule, balanceUSD);
      if (!thresholdResult.proceed) {
        await this.nextExecService.advanceNextExecution(schedule);
        return;
      }

      // Calculate payout amount (balance - reserve)
      const reserveUSD = parseFloat(schedule.reserveUsd ?? '0');
      const payoutUSD = balanceUSD - reserveUSD;
      if (payoutUSD <= 0) {
        this.logger.log(`Schedule ${schedule.id} skipped — payout amount $${payoutUSD} after reserve`);
        await this.nextExecService.advanceNextExecution(schedule);
        return;
      }

      // PS-18: Use splitEnabled flag
      if (schedule.splitEnabled && schedule.secondaryMethodId) {
        await this.executeSplit(schedule, payoutUSD, primaryMethod);
      } else {
        await this.executeSinglePayout(schedule, primaryMethod, payoutUSD, 'primary');
        await this.nextExecService.advanceNextExecution(schedule);
        await this.scheduleRepo.update(schedule.id, { consecutiveMissCount: 0 });
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
      await this.nextExecService.advanceNextExecution(schedule);
    }
  }

  // ─── PS-17 §7 + PS-18 §4.2: Split payout execution ───────
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
      this.logger.error(`Split: primary failed for schedule ${schedule.id}`);
      await this.nextExecService.advanceNextExecution(schedule);
      return;
    }

    // Step 2: Check secondary method status (PS-18 §7.1 REAUTH_REQUIRED)
    const secondaryMethod = await this.methodRepo.findOne({ where: { id: schedule.secondaryMethodId! } });
    if (!secondaryMethod || !secondaryMethod.isActive) {
      this.logger.warn(`Split: secondary method ${schedule.secondaryMethodId} inactive — primary got full amount`);
      await this.nextExecService.advanceNextExecution(schedule);
      return;
    }

    if (secondaryMethod.verificationStatus !== VerificationStatus.VERIFIED || secondaryMethod.reauthRequired) {
      // PS-18 §7.1: REAUTH_REQUIRED — skip secondary, primary already executed at its split portion
      this.logger.warn(`Split: secondary method needs reauth — skipping secondary for schedule ${schedule.id}`);
      await this.nextExecService.advanceNextExecution(schedule);
      return;
    }

    // Execute secondary
    const secondaryResult = await this.executeSinglePayout(schedule, secondaryMethod, secondaryUSD, 'secondary');
    if (secondaryResult.status === 'failed') {
      // PS-17 §8.2: Primary is NOT reversed. Secondary retried independently.
      this.logger.warn(`Split: secondary failed for schedule ${schedule.id} — primary NOT reversed`);
    }

    await this.nextExecService.advanceNextExecution(schedule);
    await this.scheduleRepo.update(schedule.id, { consecutiveMissCount: 0 });
  }

  // ─── Execute single method payout ──────────────────────────
  private async executeSinglePayout(
    schedule: PayoutSchedule,
    method: DepositMethod,
    amountUSD: number,
    splitRole: 'primary' | 'secondary',
  ): Promise<{ status: string; payoutRequestId?: string }> {
    try {
      const payout = await this.dataSource.transaction(async (em) => {
        const request = em.create(PayoutRequest, {
          contractorId: schedule.contractorId,
          depositMethodId: method.id,
          amountUsd: amountUSD.toFixed(8),
          feeUsd: '0.00000000',
          netAmountUsd: amountUSD.toFixed(8),
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

      this.logger.log(`Scheduled payout created: ${payout.id} ($${amountUSD}) → ${method.displayLabel} [${splitRole}]`);
      return { status: 'queued', payoutRequestId: payout.id };

    } catch (err: any) {
      this.logger.error(`Scheduled payout failed: ${err.message}`);
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

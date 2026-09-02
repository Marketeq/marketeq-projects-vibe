// apps/payout-service/src/schedule/schedule.service.ts
// PS-03 + PS-17 + PS-18: Schedule configuration with auto-balance split fields
import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual } from 'typeorm';
import { ConfigService }       from '@nestjs/config';
import { Cron }                from '@nestjs/schedule';
import { randomUUID }          from 'crypto';

import { PayoutSchedule, ScheduleFrequency } from '../entities/payout-schedule.entity';
import { PayoutRequest, PayoutStatus, PayoutTrigger } from '../entities/payout-request.entity';
import { DepositMethod, VerificationStatus } from '../entities/deposit-method.entity';
import { EarningsClient }     from '../common/earnings.client';
import { KycClient }          from '../common/kyc.client';
import { AuditService }       from '../audit/audit.service';
import { PayoutError }        from '../common/errors/payout.error';
import { UpdateScheduleDto }  from './dto/update-schedule.dto';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(PayoutSchedule)
    private readonly scheduleRepo: Repository<PayoutSchedule>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly earningsClient: EarningsClient,
    private readonly kycClient: KycClient,
    private readonly auditService: AuditService,
  ) {}

  // ─── GET /v1/payouts/schedule ─────────────────────────────────
  async getSchedule(contractorId: string) {
    const schedule = await this.scheduleRepo.findOne({ where: { contractorId } });

    if (!schedule) {
      return {
        scheduleId: null, isActive: true, frequency: 'weekly',
        dayOfWeek: 1, dayOfMonth: null, customIntervalDays: null,
        startDate: null, endDate: null,
        thresholdUsd: '50.00', reserveUsd: '0.00',
        splitEnabled: false,
        primarySplitPercent: 100.00,
        secondarySplitPercent: 0,
        primaryMethod: null, secondaryMethod: null,
        nextRunAt: null, lastRunAt: null, updatedAt: null,
      };
    }

    const primaryMethod = schedule.primaryMethodId
      ? await this.methodRepo.findOne({ where: { id: schedule.primaryMethodId } })
      : null;
    const secondaryMethod = schedule.secondaryMethodId
      ? await this.methodRepo.findOne({ where: { id: schedule.secondaryMethodId } })
      : null;

    const psp = parseFloat(String(schedule.primarySplitPercent));

    return {
      scheduleId: schedule.id,
      isActive: schedule.isActive,
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      customIntervalDays: schedule.customIntervalDays,
      startDate: schedule.startDate?.toISOString() ?? null,
      endDate: schedule.endDate?.toISOString() ?? null,
      thresholdUsd: schedule.thresholdUsd,
      reserveUsd: schedule.reserveUsd,
      splitEnabled: schedule.splitEnabled,
      primarySplitPercent: psp,
      secondarySplitPercent: schedule.splitEnabled
        ? Math.round((100.00 - psp) * 100) / 100
        : 0,
      primaryMethod: primaryMethod ? {
        id: primaryMethod.id, displayLabel: primaryMethod.displayLabel,
        methodType: primaryMethod.methodType, pct: psp.toFixed(2),
      } : null,
      secondaryMethod: secondaryMethod ? {
        id: secondaryMethod.id, displayLabel: secondaryMethod.displayLabel,
        methodType: secondaryMethod.methodType,
        pct: schedule.splitEnabled
          ? (Math.round((100.00 - psp) * 100) / 100).toFixed(2)
          : '0.00',
      } : null,
      splitEnabledAt: schedule.splitEnabledAt?.toISOString() ?? null,
      splitDisabledAt: schedule.splitDisabledAt?.toISOString() ?? null,
      nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
      lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
      updatedAt: schedule.updatedAt?.toISOString() ?? null,
    };
  }

  // ─── PUT /v1/payouts/schedule ─────────────────────────────────
  async updateSchedule(contractorId: string, dto: UpdateScheduleDto) {
    // Validate frequency-specific fields
    if (dto.frequency) this.validateFrequencyFields(dto);

    // Validate threshold
    if (dto.thresholdUsd !== undefined) {
      const threshold = parseFloat(dto.thresholdUsd);
      if (isNaN(threshold) || threshold < 50) {
        throw new PayoutError('Minimum threshold is $50.',
          HttpStatus.BAD_REQUEST, 'ERR_SCHEDULE_THRESHOLD_BELOW_MINIMUM');
      }
    }

    // US-72: end date, if set, must be after start date (whichever of the
    // two the request actually changes — falls back to whatever's already
    // saved on the schedule for the one not being changed).
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      const existing = await this.scheduleRepo.findOne({ where: { contractorId } });
      const effectiveStart = dto.startDate !== undefined ? new Date(dto.startDate) : existing?.startDate ?? null;
      const effectiveEnd = dto.endDate !== undefined ? new Date(dto.endDate) : existing?.endDate ?? null;
      if (effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart) {
        throw new PayoutError('End date must be after start date.',
          HttpStatus.BAD_REQUEST, 'ERR_SCHEDULE_END_DATE_BEFORE_START');
      }
    }

    // Validate reserve
    if (dto.reserveUsd !== undefined) {
      const reserve = parseFloat(dto.reserveUsd);
      if (isNaN(reserve) || reserve < 0 || reserve > 250) {
        throw new PayoutError('Reserve must be between $0 and $250.',
          HttpStatus.BAD_REQUEST, 'ERR_SCHEDULE_RESERVE_EXCEEDS_MAX');
      }
    }

    // Validate deposit methods
    if (dto.primaryMethodId) {
      const method = await this.methodRepo.findOne({
        where: { id: dto.primaryMethodId, contractorId, isActive: true },
      });
      if (!method) throw new PayoutError('Primary deposit method not found.',
        HttpStatus.BAD_REQUEST, 'ERR_SCHEDULE_METHOD_NOT_FOUND');
      if (method.verificationStatus !== VerificationStatus.VERIFIED) {
        throw new PayoutError('Primary deposit method is not verified.',
          HttpStatus.BAD_REQUEST, 'ERR_SCHEDULE_METHOD_NOT_FOUND');
      }
    }

    // Find or create schedule
    let schedule = await this.scheduleRepo.findOne({ where: { contractorId } });
    const isNew = !schedule;

    if (!schedule) {
      schedule = this.scheduleRepo.create({ contractorId });
    }

    // Apply updates (split is managed via PATCH /split — not here)
    if (dto.isActive !== undefined) schedule.isActive = dto.isActive;
    if (dto.frequency) schedule.frequency = dto.frequency as ScheduleFrequency;
    if (dto.dayOfWeek !== undefined) schedule.dayOfWeek = dto.dayOfWeek;
    if (dto.dayOfMonth !== undefined) schedule.dayOfMonth = dto.dayOfMonth;
    if (dto.customIntervalDays !== undefined) schedule.customIntervalDays = dto.customIntervalDays;
    if (dto.startDate !== undefined) schedule.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) schedule.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.thresholdUsd !== undefined) schedule.thresholdUsd = parseFloat(dto.thresholdUsd).toFixed(8);
    if (dto.reserveUsd !== undefined) schedule.reserveUsd = parseFloat(dto.reserveUsd).toFixed(8);
    if (dto.primaryMethodId !== undefined) schedule.primaryMethodId = dto.primaryMethodId;

    // Calculate next_run_at
    schedule.nextRunAt = this.advanceNextRunAt(schedule);

    await this.scheduleRepo.save(schedule);

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: 'schedule.updated', metadata: { frequency: schedule.frequency, isNew },
    });

    return this.getSchedule(contractorId);
  }

  // ─── Cron: Scheduled Payout Engine (legacy — PS-17 cron takes precedence) ──
  @Cron('* * * * *')
  async runScheduledPayouts(): Promise<void> {
    const due = await this.scheduleRepo.find({
      where: { isActive: true, nextRunAt: LessThanOrEqual(new Date()) },
      take: 100,
    });

    for (const schedule of due) {
      try {
        await this.processSchedule(schedule);
      } catch (err: any) {
        this.logger.error(`Schedule run failed: ${schedule.id}`, err.message);
      } finally {
        schedule.nextRunAt = this.advanceNextRunAt(schedule);
        schedule.lastRunAt = new Date();
        await this.scheduleRepo.save(schedule);
      }
    }
  }

  private async processSchedule(schedule: PayoutSchedule): Promise<void> {
    if (!schedule.primaryMethodId) {
      this.logger.warn(`Schedule ${schedule.id}: no primary method — skipping`);
      return;
    }

    let balance;
    try { balance = await this.earningsClient.getBalance(schedule.contractorId); }
    catch { this.logger.warn(`Balance unavailable for ${schedule.contractorId} — skipping`); return; }

    const { shouldPay, payoutAmountUsd } = this.calculatePayoutAmount(
      balance.availableBalance, schedule.thresholdUsd, schedule.reserveUsd,
    );
    if (!shouldPay) return;

    const kyc = await this.kycClient.getStatus(schedule.contractorId);
    if (kyc.firstPayoutHold || kyc.suspended) return;

    // PS-18: Use splitEnabled flag instead of checking secondaryMethodId
    if (schedule.splitEnabled && schedule.secondaryMethodId) {
      await this.executeScheduledSplit(schedule.contractorId, payoutAmountUsd, schedule);
    } else {
      await this.initiateScheduledSingle(schedule.contractorId, payoutAmountUsd, schedule);
    }
  }

  private async initiateScheduledSingle(contractorId: string, amountUsd: string, schedule: PayoutSchedule) {
    await this.payoutRepo.save({
      contractorId,
      depositMethodId: schedule.primaryMethodId,
      amountUsd, feeUsd: '0.00', netAmountUsd: amountUsd,
      idempotencyKey: randomUUID(),
      trigger: PayoutTrigger.SCHEDULED,
      status: PayoutStatus.QUEUED,
      queuedAt: new Date(),
      currency: 'USD',
    } as any);
    this.logger.log(`Scheduled payout: ${contractorId} → $${amountUsd}`);
  }

  private async executeScheduledSplit(contractorId: string, totalAmountUsd: string, schedule: PayoutSchedule) {
    const splitGroupId = randomUUID();
    const total = parseFloat(totalAmountUsd);
    const psp = parseFloat(String(schedule.primarySplitPercent));

    // PS-18 §4.2: Floor-based split
    const primaryRaw = total * psp / 100;
    const primaryAmt = (Math.floor(primaryRaw * 100) / 100).toFixed(2);
    const secondaryAmt = (Math.round((total - parseFloat(primaryAmt)) * 100) / 100).toFixed(2);

    await this.dataSource.transaction(async (em) => {
      await em.save(PayoutRequest, {
        contractorId, splitGroupId, splitSequence: 1,
        depositMethodId: schedule.primaryMethodId,
        amountUsd: primaryAmt, feeUsd: '0.00', netAmountUsd: primaryAmt,
        idempotencyKey: randomUUID(), trigger: PayoutTrigger.SCHEDULED,
        status: PayoutStatus.QUEUED, queuedAt: new Date(), currency: 'USD',
      } as any);
      await em.save(PayoutRequest, {
        contractorId, splitGroupId, splitSequence: 2,
        depositMethodId: schedule.secondaryMethodId,
        amountUsd: secondaryAmt, feeUsd: '0.00', netAmountUsd: secondaryAmt,
        idempotencyKey: randomUUID(), trigger: PayoutTrigger.SCHEDULED,
        status: PayoutStatus.QUEUED, queuedAt: new Date(), currency: 'USD',
      } as any);
    });
    this.logger.log(`Scheduled split payout: ${contractorId} → $${primaryAmt} + $${secondaryAmt}`);
  }

  private calculatePayoutAmount(availableBalance: string, thresholdUsd: string, reserveUsd: string) {
    const balance = parseFloat(availableBalance);
    const threshold = parseFloat(thresholdUsd);
    const reserve = parseFloat(reserveUsd);

    if (balance < threshold) return { shouldPay: false, payoutAmountUsd: '0.00' };
    const payoutAmount = balance - reserve;
    if (payoutAmount <= 0) return { shouldPay: false, payoutAmountUsd: '0.00' };
    return { shouldPay: true, payoutAmountUsd: payoutAmount.toFixed(2) };
  }

  private validateFrequencyFields(dto: UpdateScheduleDto): void {
    if ((dto.frequency === 'weekly' || dto.frequency === 'bi_weekly') && dto.dayOfWeek === undefined) {
      throw new PayoutError('dayOfWeek is required for weekly/bi-weekly frequency.',
        HttpStatus.BAD_REQUEST, 'ERR_SCHEDULE_INVALID_DAY_OF_WEEK');
    }
    if (dto.frequency === 'monthly' && dto.dayOfMonth === undefined) {
      throw new PayoutError('dayOfMonth is required for monthly frequency.',
        HttpStatus.BAD_REQUEST, 'ERR_SCHEDULE_INVALID_DAY_OF_MONTH');
    }
    if (dto.frequency === 'custom' && dto.customIntervalDays === undefined) {
      throw new PayoutError('customIntervalDays is required for custom frequency.',
        HttpStatus.BAD_REQUEST, 'ERR_SCHEDULE_INVALID_INTERVAL');
    }
  }

  private advanceNextRunAt(schedule: PayoutSchedule): Date {
    const now = new Date();
    switch (schedule.frequency) {
      case ScheduleFrequency.DAILY:
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      case ScheduleFrequency.WEEKLY:
        return this.nextWeekday(schedule.dayOfWeek ?? 1);
      case ScheduleFrequency.BI_WEEKLY:
        return this.addDays(this.nextWeekday(schedule.dayOfWeek ?? 1), 7);
      case ScheduleFrequency.MONTHLY:
        return this.nextMonthDay(schedule.dayOfMonth ?? 1);
      case ScheduleFrequency.CUSTOM:
        return this.addDays(now, schedule.customIntervalDays ?? 7);
      default:
        return this.addDays(now, 7);
    }
  }

  private nextWeekday(day: number): Date {
    const now = new Date();
    const current = now.getUTCDay();
    const diff = (day - current + 7) % 7 || 7;
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  }

  private nextMonthDay(day: number): Date {
    const now = new Date();
    let month = now.getUTCMonth();
    let year = now.getUTCFullYear();
    if (now.getUTCDate() >= day) { month++; if (month > 11) { month = 0; year++; } }
    return new Date(Date.UTC(year, month, day));
  }

  private addDays(d: Date, days: number): Date {
    return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
  }
}

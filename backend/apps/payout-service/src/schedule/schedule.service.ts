// apps/payout-service/src/schedule/schedule.service.ts
// PS-03 + PS-17 v2.0 + PS-18: Schedule configuration with auto-balance split fields
import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService }       from '@nestjs/config';
import Redis                   from 'ioredis';

import { PayoutSchedule, ScheduleFrequency } from '../entities/payout-schedule.entity';
import { PayoutRequest } from '../entities/payout-request.entity';
import { DepositMethod, VerificationStatus } from '../entities/deposit-method.entity';
import { EarningsClient }     from '../common/earnings.client';
import { KycClient }          from '../common/kyc.client';
import { IdentityServiceClient } from '../common/identity.client';
import { AuditService }       from '../audit/audit.service';
import { PayoutError }        from '../common/errors/payout.error';
import { UpdateScheduleDto }  from './dto/update-schedule.dto';
import { NextExecutionService, isAchMethod } from './next-execution.service';

// PS-35 §5.1: Redis key for a schedule pending the biometric gate — 1 hour
// TTL, same value the doc specifies for "contractor must complete
// verification within 1 hour."
const PENDING_SCHEDULE_TTL_SECONDS = 3600;
const pendingScheduleKey = (contractorId: string) => `pending_schedule:${contractorId}`;

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);
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
    private readonly earningsClient: EarningsClient,
    private readonly kycClient: KycClient,
    private readonly identityService: IdentityServiceClient,
    private readonly auditService: AuditService,
    private readonly nextExecService: NextExecutionService,
  ) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'));
  }

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
        nextRunAt: null, nextExecutionAt: null, lastRunAt: null, updatedAt: null,
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
      // nextRunAt is the pre-existing field name this response has always
      // used; nextExecutionAt is the PS-17 v2.0 doc-accurate name for the
      // same value (both are kept in sync by NextExecutionService and
      // updateSchedule() below) — added rather than renamed since no
      // existing consumer of nextRunAt could be verified from this task.
      nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
      nextExecutionAt: schedule.nextExecutionAt?.toISOString() ?? null,
      lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
      updatedAt: schedule.updatedAt?.toISOString() ?? null,
    };
  }

  // ─── PUT /v1/payouts/schedule ─────────────────────────────────
  async updateSchedule(contractorId: string, dto: UpdateScheduleDto, skipBiometricGate = false) {
    // Validate frequency-specific fields
    if (dto.frequency) this.validateFrequencyFields(dto);

    // Validate threshold — PS-03 §2.3: $50 minimum, $1,000,000 sanity cap
    if (dto.thresholdUsd !== undefined) {
      const threshold = parseFloat(dto.thresholdUsd);
      if (isNaN(threshold) || threshold < 50) {
        throw new PayoutError('Minimum threshold is $50.',
          HttpStatus.BAD_REQUEST, 'ERR_SCHEDULE_THRESHOLD_BELOW_MINIMUM');
      }
      if (threshold > 1_000_000) {
        throw new PayoutError('Maximum threshold is $1,000,000.',
          HttpStatus.BAD_REQUEST, 'ERR_SCHEDULE_THRESHOLD_ABOVE_MAXIMUM');
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

    // Validate deposit methods + PS-17 v2.0 §4/PS-32 §4.3: frequency=daily
    // is ACH-only. Resolve the *effective* primary method — either the one
    // this request is setting, or the one already on the schedule — since a
    // frequency-only update (no primaryMethodId in this call) must still be
    // checked against whichever method is actually configured.
    let effectiveMethod: DepositMethod | null = null;
    if (dto.primaryMethodId) {
      effectiveMethod = await this.methodRepo.findOne({
        where: { id: dto.primaryMethodId, contractorId, isActive: true },
      });
      if (!effectiveMethod) throw new PayoutError('Primary deposit method not found.',
        HttpStatus.BAD_REQUEST, 'ERR_SCHEDULE_METHOD_NOT_FOUND');
      if (effectiveMethod.verificationStatus !== VerificationStatus.VERIFIED) {
        throw new PayoutError('Primary deposit method is not verified.',
          HttpStatus.BAD_REQUEST, 'ERR_SCHEDULE_METHOD_NOT_FOUND');
      }
    }

    // Find or create schedule
    let schedule = await this.scheduleRepo.findOne({ where: { contractorId } });
    const isNew = !schedule;

    // PS-35 §2/§5.1: biometric gate applies only to the FIRST schedule ever
    // created for a contractor, never again after. skipBiometricGate is set
    // only by the RabbitMQ consumer resuming a schedule whose gate already
    // cleared (consumers/identity-events.consumer.ts) — the contractor-facing
    // entry point (schedule.controller.ts) always passes false.
    //
    // FEATURE_BIOMETRIC_GATE_ENABLED defaults false: identity-service does
    // not implement the two status endpoints this calls yet (confirmed —
    // no biometric capability exists there today), and PS-35 §8 requires
    // failing closed (503) rather than skipping the gate when
    // identity-service is unreachable. Deployed with the gate always-on,
    // that would 503 every contractor's first schedule creation — a real
    // regression of working functionality, not a feature the flag is
    // "adding". Flip this on once identity-service ships PS-35.
    const biometricGateEnabled = this.config.get('FEATURE_BIOMETRIC_GATE_ENABLED', 'false') === 'true';
    if (isNew && !skipBiometricGate && biometricGateEnabled) {
      const biometric = await this.identityService.getScheduleGateStatus(contractorId);

      if (biometric.gate === 'FAILED') {
        throw new PayoutError(
          'Identity verification failed. You have used all 3 attempts. Please contact support.',
          HttpStatus.FORBIDDEN, 'ERR_BIOMETRIC_VERIFICATION_FAILED',
        );
      }

      if (biometric.gate === 'REQUIRED') {
        await this.redis.set(
          pendingScheduleKey(contractorId),
          JSON.stringify(dto),
          'EX', PENDING_SCHEDULE_TTL_SECONDS,
        );
        await this.auditService.log({
          contractorId, actorType: 'contractor', actorId: contractorId,
          action: 'schedule.biometric_required',
        });
        return {
          status: 'VERIFICATION_REQUIRED' as const,
          sessionUrl: biometric.sessionUrl,
          message: 'Identity verification required before your first automatic payout schedule can be activated.',
        };
      }

      // gate === 'VERIFIED' — fall through to normal creation below.
    }

    if (!schedule) {
      schedule = this.scheduleRepo.create({ contractorId });
    }

    if (!effectiveMethod && schedule.primaryMethodId) {
      effectiveMethod = await this.methodRepo.findOne({ where: { id: schedule.primaryMethodId } });
    }

    // PS-41 §5: daily frequency is shown/allowed only for BANK_STRIPE and
    // BANK_MANUAL/US — an international BANK_MANUAL routes through Stripe
    // cross-border or Wise Platform (PS-34 §7), neither of which supports a
    // same-day-every-day initiation cadence the way domestic ACH does.
    const effectiveFrequency = (dto.frequency as ScheduleFrequency) ?? schedule.frequency;
    if (
      effectiveFrequency === ScheduleFrequency.DAILY &&
      effectiveMethod &&
      !isAchMethod(effectiveMethod.methodType, effectiveMethod.bankCountry)
    ) {
      throw new PayoutError(
        'Daily payout frequency is only available for US bank (ACH) deposit methods.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_SCHEDULE_INVALID_FREQUENCY',
        { frequency: effectiveFrequency, methodType: effectiveMethod.methodType });
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
    if (!schedule.anchorDate) schedule.anchorDate = new Date();

    // PS-17 v2.0 §9: method-type-aware next execution date (ARRIVAL day for
    // ACH, back-calculated to the initiation date; INITIATION day directly
    // for everything else) — previously always "next Monday 9am UTC"
    // regardless of method type or configured day.
    const next = this.nextExecService.calculateNext(
      schedule.frequency, schedule.dayOfWeek, schedule.dayOfMonth,
      schedule.anchorDate, effectiveMethod?.methodType ?? null, new Date(),
      schedule.customIntervalDays, effectiveMethod?.bankCountry,
    );
    schedule.nextExecutionAt = next;
    schedule.nextRunAt = next;

    await this.scheduleRepo.save(schedule);

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: 'schedule.updated', metadata: { frequency: schedule.frequency, isNew },
    });

    return this.getSchedule(contractorId);
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
}

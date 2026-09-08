// apps/payout-service/src/schedule/next-execution.service.ts
// PS-17 v2.0 §9: calculate the next execution (initiation) date for each
// schedule frequency, method-type-aware per §2:
//   - BANK_STRIPE/BANK_MANUAL (ACH): dayOfWeek/dayOfMonth is the ARRIVAL
//     day. Back-calculate the initiation date via AchInitiationCalculator
//     (T-2 business days, weekend/holiday-adjusted).
//   - WISE/PAYONEER/CRYPTO/everything else: dayOfWeek/dayOfMonth IS the
//     initiation day directly — no back-calculation, no weekend/holiday
//     adjustment (PS-32 §4.3 — those rails run 24/7).
// Previously this ignored dayOfWeek/dayOfMonth entirely and always snapped
// to "next Monday 9am UTC" regardless of method type or the contractor's
// configured day.
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutSchedule, ScheduleFrequency } from '../entities/payout-schedule.entity';
import { MethodType } from '../entities/deposit-method.entity';
import { AchInitiationCalculatorService } from './ach-initiation-calculator.service';

export const ACH_METHOD_TYPES: MethodType[] = [MethodType.BANK_STRIPE, MethodType.BANK_MANUAL];

@Injectable()
export class NextExecutionService {
  private readonly logger = new Logger(NextExecutionService.name);

  constructor(
    @InjectRepository(PayoutSchedule)
    private readonly scheduleRepo: Repository<PayoutSchedule>,
    private readonly achCalculator: AchInitiationCalculatorService,
  ) {}

  /**
   * PS-17 v2.0 §9: advance nextExecutionAt to the next due initiation date
   * for this schedule's primary method type, and persist it.
   *
   * Also mirrors the result onto the legacy nextRunAt/lastRunAt columns —
   * schedule.controller.ts's GET /v1/payouts/schedule still surfaces
   * nextRunAt in its response (no other backend service reads it, but the
   * frontend contract for that field could not be verified from this task,
   * so it is kept populated and correct rather than dropped) — see
   * nextExecutionAt for the doc-accurate field name going forward.
   */
  async advanceNextExecution(schedule: PayoutSchedule, primaryMethodType: MethodType | null): Promise<void> {
    const next = this.calculateNext(
      schedule.frequency,
      schedule.dayOfWeek,
      schedule.dayOfMonth,
      schedule.anchorDate ?? schedule.createdAt,
      primaryMethodType,
      new Date(),
      schedule.customIntervalDays,
    );

    await this.scheduleRepo.update(schedule.id, {
      nextExecutionAt: next,
      nextRunAt: next,
      lastRunAt: new Date(),
    });
  }

  /**
   * Pure calculation, no DB write — used by advanceNextExecution() above and
   * by ScheduleService.updateSchedule() (which needs the value before the
   * schedule row is saved, and does not want advanceNextExecution's
   * lastRunAt/consecutiveMissCount side effects).
   */
  calculateNext(
    frequency: ScheduleFrequency,
    dayOfWeek: number | null,
    dayOfMonth: number | null,
    anchorDate: Date,
    primaryMethodType: MethodType | null,
    from: Date,
    customIntervalDays: number | null = null,
  ): Date {
    // Unknown/missing primary method (e.g. deactivated between ticks): fall
    // back to non-ACH treatment. This under-adjusts rather than over-
    // adjusts — it never back-calculates against a method that turns out
    // not to be ACH, and the schedule will self-correct once a valid
    // primary method resolves on the next update/tick.
    const isACH = !!primaryMethodType && ACH_METHOD_TYPES.includes(primaryMethodType);

    switch (frequency) {
      case ScheduleFrequency.DAILY:
        // PS-32 §4.3 / PS-17 §4: daily is ACH-only (rejected for other
        // method types at the API validation layer) — always the next
        // business day, dayOfWeek does not apply to daily.
        return this.nextDaily(from);
      case ScheduleFrequency.WEEKLY:
        return this.resolveInitiationDate(this.nextOccurrenceOfDay(dayOfWeek ?? 1, from, 1), isACH);
      case ScheduleFrequency.BI_WEEKLY:
        return this.resolveInitiationDate(this.nextBiweeklyTarget(dayOfWeek ?? 1, anchorDate, from), isACH);
      case ScheduleFrequency.MONTHLY:
        return this.resolveInitiationDate(this.nextMonthlyTarget(dayOfMonth ?? 1, from), isACH);
      case ScheduleFrequency.CUSTOM:
        return this.resolveInitiationDate(this.addDays(from, customIntervalDays ?? 7), isACH);
      default:
        return this.resolveInitiationDate(this.addDays(from, 7), isACH);
    }
  }

  // For ACH, `target` is the contractor's selected ARRIVAL day — back-
  // calculate the initiation date. For every other method type, `target` IS
  // the initiation day already (PS-32 §4.3): no adjustment.
  private resolveInitiationDate(target: Date, isACH: boolean): Date {
    target.setUTCHours(9, 0, 0, 0);
    return isACH ? this.achCalculator.getACHInitiationDate(target) : this.achCalculator.getNonACHInitiationDate(target);
  }

  private nextOccurrenceOfDay(dayOfWeek: number, from: Date, minDaysAhead: number): Date {
    const fromDay = from.getUTCDay();
    let daysAhead = (dayOfWeek - fromDay + 7) % 7;
    if (daysAhead < minDaysAhead) daysAhead += 7;
    const result = new Date(from);
    result.setUTCDate(from.getUTCDate() + daysAhead);
    result.setUTCHours(9, 0, 0, 0);
    return result;
  }

  private nextBiweeklyTarget(dayOfWeek: number, anchorDate: Date, from: Date): Date {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceAnchor = Math.floor((from.getTime() - anchorDate.getTime()) / msPerWeek);
    const weeksUntilNext = weeksSinceAnchor % 2 === 0 ? 2 : 1;
    const target = this.nextOccurrenceOfDay(dayOfWeek, from, 1);
    target.setUTCDate(target.getUTCDate() + (weeksUntilNext - 1) * 7);
    return target;
  }

  // Next occurrence of dayOfMonth (1-28 — 29-31 excluded at the DTO
  // validation layer to avoid month-end edge cases, per PS-17 §4).
  private nextMonthlyTarget(dayOfMonth: number, from: Date): Date {
    let year = from.getUTCFullYear();
    let month = from.getUTCMonth();
    let target = new Date(Date.UTC(year, month, dayOfMonth, 9, 0, 0));
    if (target.getTime() <= from.getTime()) {
      month += 1;
      if (month > 11) { month = 0; year += 1; }
      target = new Date(Date.UTC(year, month, dayOfMonth, 9, 0, 0));
    }
    return target;
  }

  private nextDaily(from: Date): Date {
    const next = new Date(from);
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(9, 0, 0, 0);
    // Daily is ACH-only — this IS the initiation day already (not an
    // arrival day to back-calculate from), so just skip past
    // weekends/holidays directly to the next business day.
    while (!this.achCalculator.isBusinessDay(next)) next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }

  private addDays(from: Date, days: number): Date {
    const next = new Date(from);
    next.setUTCDate(next.getUTCDate() + days);
    next.setUTCHours(9, 0, 0, 0);
    return next;
  }
}

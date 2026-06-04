// apps/payout-service/src/schedule/next-execution.service.ts
// PS-17 §6: Calculate next execution date for each frequency type.
// Handles holiday/weekend adjustment.

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayoutSchedule, ScheduleFrequency } from '../entities/payout-schedule.entity';

// US Federal Holidays 2026 (dates in UTC)
const US_HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-05-25',
  '2026-07-03', '2026-09-07', '2026-10-12', '2026-11-11',
  '2026-11-26', '2026-12-25',
];

@Injectable()
export class NextExecutionService {
  private readonly logger = new Logger(NextExecutionService.name);

  constructor(
    @InjectRepository(PayoutSchedule)
    private readonly scheduleRepo: Repository<PayoutSchedule>,
  ) {}

  /**
   * PS-17 §6: Advance nextExecutionAt to next due date.
   */
  async advanceNextExecution(schedule: PayoutSchedule): Promise<void> {
    const next = this.calculateNext(
      schedule.frequency,
      schedule.anchorDate ?? schedule.createdAt,
      new Date(),
    );

    await this.scheduleRepo.update(schedule.id, {
      nextExecutionAt: next,
      lastRunAt: new Date(),
    });
  }

  /**
   * Calculate the next execution date based on frequency.
   */
  calculateNext(frequency: ScheduleFrequency, anchorDate: Date, from: Date): Date {
    switch (frequency) {
      case ScheduleFrequency.WEEKLY:
        return this.nextWeekly(from);
      case ScheduleFrequency.BI_WEEKLY:
        return this.nextBiweekly(anchorDate, from);
      case ScheduleFrequency.MONTHLY:
        return this.nextMonthly(from);
      case ScheduleFrequency.DAILY:
        return this.nextDaily(from);
      default:
        // CUSTOM or unknown — default to weekly
        return this.nextWeekly(from);
    }
  }

  // Next Monday at 09:00 UTC
  private nextWeekly(from: Date): Date {
    const next = new Date(from);
    const daysUntilMonday = (1 + 7 - next.getUTCDay()) % 7 || 7;
    next.setUTCDate(next.getUTCDate() + daysUntilMonday);
    next.setUTCHours(9, 0, 0, 0);
    return this.adjustForHolidayAndWeekend(next);
  }

  // Every other Monday based on anchor parity
  private nextBiweekly(anchorDate: Date, from: Date): Date {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceAnchor = Math.floor((from.getTime() - anchorDate.getTime()) / msPerWeek);
    const weeksUntilNext = weeksSinceAnchor % 2 === 0 ? 2 : 1;
    const next = new Date(from);
    next.setUTCDate(next.getUTCDate() + (weeksUntilNext * 7));
    // Snap to Monday
    const dayOffset = (1 + 7 - next.getUTCDay()) % 7;
    if (dayOffset > 0 && dayOffset < 7) next.setUTCDate(next.getUTCDate() + dayOffset);
    next.setUTCHours(9, 0, 0, 0);
    return this.adjustForHolidayAndWeekend(next);
  }

  // 1st of next month at 09:00 UTC
  private nextMonthly(from: Date): Date {
    const year = from.getUTCMonth() === 11 ? from.getUTCFullYear() + 1 : from.getUTCFullYear();
    const month = (from.getUTCMonth() + 1) % 12;
    const next = new Date(Date.UTC(year, month, 1, 9, 0, 0));
    return this.adjustForHolidayAndWeekend(next);
  }

  // Next business day at 09:00 UTC
  private nextDaily(from: Date): Date {
    const next = new Date(from);
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(9, 0, 0, 0);
    return this.adjustForHolidayAndWeekend(next);
  }

  // PS-17 §2: Weekend/holiday adjustment
  private adjustForHolidayAndWeekend(date: Date): Date {
    const result = new Date(date);
    let attempts = 0;
    while (attempts < 10) {
      const day = result.getUTCDay();
      if (day === 0) { // Sunday → Monday
        result.setUTCDate(result.getUTCDate() + 1);
      } else if (day === 6) { // Saturday → previous Friday
        result.setUTCDate(result.getUTCDate() - 1);
      } else if (this.isPublicHoliday(result)) {
        result.setUTCDate(result.getUTCDate() + 1);
      } else {
        break;
      }
      attempts++;
    }
    return result;
  }

  private isPublicHoliday(date: Date): boolean {
    const dateStr = date.toISOString().slice(0, 10);
    return US_HOLIDAYS_2026.includes(dateStr);
  }
}
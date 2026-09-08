// apps/payout-service/src/schedule/ach-initiation-calculator.service.ts
// PS-17 v2.0 §3 + PS-32 §4.2/§4.3: ACH back-calculation — for BANK_STRIPE/
// BANK_MANUAL, schedule.dayOfWeek/dayOfMonth means the ARRIVAL day, not the
// initiation day. The NACHA network settles ACH T+2 business days after
// submission and does not process files on weekends or US federal holidays
// (a network rule, not a Marketeq policy choice) — so the engine must:
//   1. push a weekend/holiday arrival day to the next business day, then
//   2. count back 2 business days from that adjusted arrival to find the
//      date payout-service must submit to Stripe.
// WISE/PAYONEER/CRYPTO never call getACHInitiationDate() — for those,
// dayOfWeek/dayOfMonth IS the initiation day directly (see
// NextExecutionService), since none of those rails are NACHA-bound.
//
// Uses UTC calendar-day math throughout, consistent with the rest of this
// service's date handling (payout-schedule.entity.ts's timestamptz columns,
// next-execution.service.ts's existing convention) — deliberately not
// date-fns's plain (locally-scoped) day functions, which would drift a day
// depending on server timezone.
import { Injectable } from '@nestjs/common';

@Injectable()
export class AchInitiationCalculatorService {
  // US Federal holidays, exact dates (not the approximate MM-DD floating-
  // holiday rules PS-17 §3's reference implementation uses) — this service
  // already carried a fully-enumerated year list before this rewrite
  // (next-execution.service.ts's US_HOLIDAYS_2026), which the doc itself
  // recommends over the approximate list for production use. Extend this
  // list every January.
  private readonly US_FEDERAL_HOLIDAYS: string[] = [
    // 2026
    '2026-01-01', // New Year's Day
    '2026-01-19', // MLK Day
    '2026-02-16', // Presidents Day
    '2026-05-25', // Memorial Day
    '2026-07-03', // Independence Day (observed — Jul 4 falls on Saturday)
    '2026-09-07', // Labor Day
    '2026-10-12', // Columbus Day
    '2026-11-11', // Veterans Day
    '2026-11-26', // Thanksgiving
    '2026-12-25', // Christmas Day
    // 2027
    '2027-01-01', '2027-01-18', '2027-02-15', '2027-05-31', '2027-06-18',
    '2027-07-05', '2027-09-06', '2027-10-11', '2027-11-11', '2027-11-25', '2027-12-24',
  ];

  isBusinessDay(date: Date): boolean {
    const day = date.getUTCDay();
    if (day === 0 || day === 6) return false;
    return !this.isHoliday(date);
  }

  isHoliday(date: Date): boolean {
    return this.US_FEDERAL_HOLIDAYS.includes(date.toISOString().slice(0, 10));
  }

  /**
   * PS-17 v2.0 §3: given a target ARRIVAL date for an ACH payout, calculate
   * the INITIATION date (T-2 business days before arrival). If the target
   * arrival falls on a weekend/holiday, arrival is first moved to the next
   * business day, then initiation is calculated from that adjusted arrival.
   */
  getACHInitiationDate(targetArrival: Date): Date {
    let adjustedArrival = new Date(targetArrival);
    while (!this.isBusinessDay(adjustedArrival)) {
      adjustedArrival.setUTCDate(adjustedArrival.getUTCDate() + 1);
    }

    let initiationDate = new Date(adjustedArrival);
    let businessDaysBack = 0;
    while (businessDaysBack < 2) {
      initiationDate.setUTCDate(initiationDate.getUTCDate() - 1);
      if (this.isBusinessDay(initiationDate)) businessDaysBack++;
    }

    return initiationDate;
  }

  /**
   * PS-17 v2.0 §3: for non-ACH methods (WISE, PAYONEER, CRYPTO), the
   * initiation date IS the selected day — no back-calculation, no
   * weekend/holiday adjustment (PS-32 §4.3 — those rails run 24/7).
   */
  getNonACHInitiationDate(selectedDay: Date): Date {
    return selectedDay;
  }
}

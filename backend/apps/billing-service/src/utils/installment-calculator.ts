import { BillingFrequency } from '../entities/subscription.entity';

const MS_IN_WEEK = 7 * 24 * 60 * 60 * 1000;
const MS_IN_MONTH = 30 * 24 * 60 * 60 * 1000;

export function calculateInstallmentCount(
  startDate: Date,
  endDate: Date | null,
  frequency: BillingFrequency,
): number {
  if (!endDate) return 0; // ongoing — no fixed count

  const durationMs = endDate.getTime() - startDate.getTime();

  switch (frequency) {
    case BillingFrequency.WEEKLY:
      return Math.ceil(durationMs / MS_IN_WEEK);
    case BillingFrequency.BIWEEKLY:
      return Math.ceil(durationMs / (2 * MS_IN_WEEK));
    case BillingFrequency.MONTHLY:
      return Math.ceil(durationMs / MS_IN_MONTH);
  }
}

export function getStripeInterval(frequency: BillingFrequency): {
  interval: 'week' | 'month';
  interval_count: number;
} {
  switch (frequency) {
    case BillingFrequency.WEEKLY:
      return { interval: 'week', interval_count: 1 };
    case BillingFrequency.BIWEEKLY:
      return { interval: 'week', interval_count: 2 };
    case BillingFrequency.MONTHLY:
      return { interval: 'month', interval_count: 1 };
  }
}

export function getDepositMultiplier(frequency: BillingFrequency): number {
  // Deposit = first N installments per docs
  switch (frequency) {
    case BillingFrequency.WEEKLY:    return 1;
    case BillingFrequency.BIWEEKLY:  return 2;
    case BillingFrequency.MONTHLY:   return 1;
  }
}

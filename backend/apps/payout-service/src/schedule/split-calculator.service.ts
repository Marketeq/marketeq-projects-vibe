// apps/payout-service/src/schedule/split-calculator.service.ts
// PS-18 §4.2: Execution-time split amount calculation.
// Primary receives floor of (balance × percent / 100) at cent level.
// Secondary receives exact remainder. Invariant check: sum = balance.

import { Injectable, HttpStatus } from '@nestjs/common';
import { PayoutError } from '../common/errors/payout.error';

@Injectable()
export class SplitCalculatorService {
  /**
   * PS-18 §4.2 — Split a USD balance between primary and secondary methods.
   *
   * @param balanceUSD  Total payout amount in USD
   * @param primarySplitPercent  e.g. 66.67
   * @returns { primaryUSD, secondaryUSD } both rounded to 2dp, summing exactly to balanceUSD
   */
  splitAmount(
    balanceUSD: number,
    primarySplitPercent: number,
  ): { primaryUSD: number; secondaryUSD: number } {
    // Primary: truncate to 2dp (floor at cent level)
    const primaryRaw = balanceUSD * primarySplitPercent / 100;
    const primaryUSD = Math.floor(primaryRaw * 100) / 100;

    // Secondary: exact remainder — no independent rounding
    const secondaryUSD = Math.round((balanceUSD - primaryUSD) * 100) / 100;

    // Invariant check — must sum exactly to balance
    // If floating point produces a discrepancy > $0.01, throw — do not execute
    const sum = Math.round((primaryUSD + secondaryUSD) * 100) / 100;
    if (Math.abs(sum - balanceUSD) > 0.01) {
      throw new PayoutError(
        'Split amount rounding produced an invalid result.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'ERR_SPLIT_ROUNDING_FAULT',
        { balanceUSD, primaryUSD, secondaryUSD, sum },
      );
    }

    return { primaryUSD, secondaryUSD };
  }

  /**
   * PS-18 §4.1 — Truncate a user-supplied percentage to 2 decimal places.
   * Truncate, do NOT round up. 33.337 → 33.33, not 33.34.
   */
  truncateTo2dp(value: number): number {
    return Math.floor(value * 100) / 100;
  }

  /**
   * PS-18 §9 — Validate that a split percent is within [0.01, 99.99] after truncation.
   */
  validateSplitPercent(value: number): void {
    const truncated = this.truncateTo2dp(value);
    if (truncated < 0.01 || truncated > 99.99) {
      throw new PayoutError(
        'Each account must receive between 0.01% and 99.99%.',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ERR_SPLIT_PERCENT_OUT_OF_RANGE',
        { value: truncated },
      );
    }
  }
}

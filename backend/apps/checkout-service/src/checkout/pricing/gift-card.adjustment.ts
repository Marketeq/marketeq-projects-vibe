import { Injectable } from '@nestjs/common';
import {
  AdjustmentResult,
  PricingAdjustment,
  PricingContext,
} from './pricing.types';

@Injectable()
export class GiftCardAdjustment implements PricingAdjustment {
  apply(context: PricingContext, runningCents: number): AdjustmentResult {
    let remainingCents = runningCents;
    const details: Array<{ code: string; amountCents: number }> = [];

    for (const entry of context.giftCards) {
      if (entry.status !== 'valid') continue;
      const usedCents = Math.min(
        Math.round(entry.amount * 100),
        remainingCents,
      );
      if (usedCents <= 0) continue;
      remainingCents -= usedCents;
      details.push({ code: entry.code, amountCents: -usedCents });
    }

    if (details.length === 0) {
      return { runningCents, lines: [], totals: { giftCardAppliedTotal: 0 } };
    }

    const totalCents = runningCents - remainingCents;
    return {
      runningCents: remainingCents,
      lines: [
        {
          key: 'giftCards',
          label:
            details.length === 1
              ? 'Gift card applied'
              : `${details.length} Gift cards applied`,
          amountCents: -totalCents,
          count: details.length,
          details,
        },
      ],
      totals: { giftCardAppliedTotal: totalCents },
    };
  }
}

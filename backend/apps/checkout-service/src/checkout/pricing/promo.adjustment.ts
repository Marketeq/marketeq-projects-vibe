import { Injectable } from '@nestjs/common';
import {
  AdjustmentResult,
  PricingAdjustment,
  PricingContext,
} from './pricing.types';

@Injectable()
export class PromoAdjustment implements PricingAdjustment {
  apply(context: PricingContext, runningCents: number): AdjustmentResult {
    const promo = context.codes.find(
      (entry) => entry.type === 'promo' && entry.status === 'valid',
    );
    const discountCents = promo
      ? Math.min(Math.round(promo.amount * 100), runningCents)
      : 0;

    if (!promo || discountCents <= 0) {
      return { runningCents, lines: [], totals: { discountTotal: 0 } };
    }

    return {
      runningCents: runningCents - discountCents,
      lines: [
        {
          key: 'promo',
          label: 'Promo code applied',
          amountCents: -discountCents,
          count: 1,
          details: [{ code: promo.code, amountCents: -discountCents }],
        },
      ],
      totals: { discountTotal: discountCents },
    };
  }
}

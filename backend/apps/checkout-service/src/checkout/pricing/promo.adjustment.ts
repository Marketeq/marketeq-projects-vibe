import { Injectable } from '@nestjs/common';
import { DraftPromoEntry } from '../checkout-draft-code.service';
import {
  AdjustmentResult,
  PricingAdjustment,
  PricingContext,
} from './pricing.types';

export const promoDiscountCents = (
  promo: Pick<DraftPromoEntry, 'discountType' | 'discountValue'>,
  runningCents: number,
): number => {
  const raw =
    promo.discountType === 'percent'
      ? Math.round((runningCents * promo.discountValue) / 100)
      : Math.round(promo.discountValue * 100);
  return Math.min(raw, runningCents);
};

@Injectable()
export class PromoAdjustment implements PricingAdjustment {
  apply(context: PricingContext, runningCents: number): AdjustmentResult {
    const promo = context.promo;
    const discountCents =
      promo && promo.status === 'valid'
        ? promoDiscountCents(promo, runningCents)
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

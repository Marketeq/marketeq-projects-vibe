import { DraftCodeEntry } from '../checkout-draft-code.service';

export const DRAFT_PRICING_ADJUSTMENTS = 'DRAFT_PRICING_ADJUSTMENTS';

export type PricingContext = {
  codes: DraftCodeEntry[];
};

export type PricingLineCents = {
  key: string;
  label: string;
  amountCents: number;
  count?: number;
  details?: Array<{ code: string; amountCents: number }>;
};

export type AdjustmentResult = {
  runningCents: number;
  lines: PricingLineCents[];
  totals: Record<string, number>;
};

export interface PricingAdjustment {
  apply(context: PricingContext, runningCents: number): AdjustmentResult;
}

import { Inject, Injectable } from '@nestjs/common';
import { CheckoutDraftService } from '../checkout-draft.service';
import { CheckoutDraftCodeService } from '../checkout-draft-code.service';
import { CheckoutSummaryService } from '../checkout-summary.service';
import {
  DRAFT_PRICING_ADJUSTMENTS,
  PricingAdjustment,
  PricingLineCents,
} from './pricing.types';

const toDollars = (cents: number) => Math.round(cents) / 100;

@Injectable()
export class CheckoutDraftPricingService {
  constructor(
    private readonly draftService: CheckoutDraftService,
    private readonly codeService: CheckoutDraftCodeService,
    private readonly summaryService: CheckoutSummaryService,
    @Inject(DRAFT_PRICING_ADJUSTMENTS)
    private readonly adjustments: PricingAdjustment[],
  ) {}

  async getPricing(clientId: string, draftId: string) {
    const { draft, phases } = await this.draftService.getPricingScope(
      clientId,
      draftId,
    );

    const assigneeIds = Array.from(
      new Set(
        phases.flatMap((phase) =>
          phase.tasks
            .map((task) => task.assigneeUserId)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    );
    const [memberRates, { giftCards, promo }] = await Promise.all([
      this.summaryService.fetchMemberRates(draft.listingId, assigneeIds),
      this.codeService.listCodes(draft),
    ]);

    const projectCost = await this.summaryService.priceScope(
      phases.map((phase) => ({
        tasks: phase.tasks.map((task) => ({
          roleName: task.roleName,
          experienceLevel: task.experienceLevel,
          location: task.location?.[0] ?? null,
          estimatedHours: task.durationHours ?? 0,
          hourlyRate: task.assigneeUserId
            ? (memberRates.get(task.assigneeUserId) ?? null)
            : null,
        })),
      })),
    );

    const projectCostCents = Math.round(projectCost * 100);
    let runningCents = projectCostCents;
    const lines: PricingLineCents[] = [];
    const totals: Record<string, number> = {
      discountTotal: 0,
      giftCardAppliedTotal: 0,
    };

    for (const adjustment of this.adjustments) {
      const result = adjustment.apply({ giftCards, promo }, runningCents);
      runningCents = Math.max(0, result.runningCents);
      lines.push(...result.lines);
      Object.assign(totals, result.totals);
    }

    const promoCode = promo
      ? {
          code: promo.code,
          status: promo.status,
          amount: toDollars(totals.discountTotal),
          discountType: promo.discountType,
          discountValue: promo.discountValue,
        }
      : null;

    return {
      projectCost: toDollars(projectCostCents),
      lines: lines.map((line) => ({
        key: line.key,
        label: line.label,
        amount: toDollars(line.amountCents),
        ...(line.count !== undefined ? { count: line.count } : {}),
        ...(line.details
          ? {
              details: line.details.map((detail) => ({
                code: detail.code,
                amount: toDollars(detail.amountCents),
              })),
            }
          : {}),
      })),
      ...Object.fromEntries(
        Object.entries(totals).map(([key, cents]) => [key, toDollars(cents)]),
      ),
      total: toDollars(runningCents),
      giftCards,
      promoCode,
    };
  }

  async getCodes(clientId: string, draftId: string) {
    const { giftCards, promoCode } = await this.getPricing(clientId, draftId);
    return { giftCards, promoCode };
  }
}

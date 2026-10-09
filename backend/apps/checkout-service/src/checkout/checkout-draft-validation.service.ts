import {
  BadGatewayException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CheckoutDraftPricingService } from './pricing/checkout-draft-pricing.service';
import { CheckoutDraft } from './entities/checkout-draft.entity';
import { CheckoutDraftPhaseEntity } from './entities/checkout-draft-phase.entity';

export type BlockingReason = { code: string; total?: number };

export type DraftPricing = Awaited<
  ReturnType<CheckoutDraftPricingService['getPricing']>
>;

const toCents = (dollars: number) => Math.round(dollars * 100);

@Injectable()
export class CheckoutDraftValidationService {
  constructor(
    private readonly pricingService: CheckoutDraftPricingService,
  ) {}

  assertCurrentVersion(draft: CheckoutDraft, version: number) {
    if (draft.version !== version) {
      throw new ConflictException({
        code: 'DRAFT_STALE',
        message: 'Draft version is out of date',
      });
    }
  }

  async runChecks(
    clientId: string,
    draft: CheckoutDraft,
    phases: CheckoutDraftPhaseEntity[],
    expectedTotal?: number,
  ): Promise<{ reasons: BlockingReason[]; pricing: DraftPricing | null }> {
    const reasons: BlockingReason[] = [
      ...this.checkScope(phases),
      ...this.checkTeam(draft, phases),
    ];

    if (reasons.length > 0) return { reasons, pricing: null };
    return this.checkPrice(clientId, draft.id, expectedTotal);
  }

  private checkScope(phases: CheckoutDraftPhaseEntity[]): BlockingReason[] {
    if (phases.length === 0) return [{ code: 'SCOPE_EMPTY' }];
    const reasons: BlockingReason[] = [];
    if (phases.some((phase) => phase.tasks.length === 0)) {
      reasons.push({ code: 'PHASE_EMPTY' });
    }
    return reasons;
  }

  private checkTeam(
    draft: CheckoutDraft,
    phases: CheckoutDraftPhaseEntity[],
  ): BlockingReason[] {
    const tasks = phases.flatMap((phase) => phase.tasks);
    if (tasks.length === 0) return [];
    return Object.keys(draft.members).length > 0
      ? []
      : [{ code: 'TEAM_EMPTY' }];
  }

  private async checkPrice(
    clientId: string,
    draftId: string,
    expectedTotal?: number,
  ): Promise<{ reasons: BlockingReason[]; pricing: DraftPricing | null }> {
    let pricing: DraftPricing;
    try {
      pricing = await this.pricingService.getPricing(clientId, draftId);
    } catch (err) {
      if (err instanceof BadGatewayException) {
        throw new BadGatewayException({
          code: 'PRICING_UNAVAILABLE',
          message: 'Pricing is temporarily unavailable',
        });
      }
      throw err;
    }

    const reasons: BlockingReason[] = [];
    if (pricing.projectCost <= 0) reasons.push({ code: 'PRICE_ZERO' });
    if (
      expectedTotal !== undefined &&
      toCents(expectedTotal) !== toCents(pricing.total)
    ) {
      reasons.push({ code: 'PRICE_CHANGED', total: pricing.total });
    }
    return { reasons, pricing };
  }
}

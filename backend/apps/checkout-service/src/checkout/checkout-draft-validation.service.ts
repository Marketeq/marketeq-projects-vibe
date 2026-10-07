import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CheckoutSummaryService } from './checkout-summary.service';
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
    private readonly summaryService: CheckoutSummaryService,
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
      ...this.checkTeam(phases),
      ...(await this.checkListing(draft)),
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
    const tasks = phases.flatMap((phase) => phase.tasks);
    if (tasks.some((task) => !task.roleName?.trim())) {
      reasons.push({ code: 'TASK_MISSING_ROLE' });
    }
    return reasons;
  }

  private checkTeam(phases: CheckoutDraftPhaseEntity[]): BlockingReason[] {
    const tasks = phases.flatMap((phase) => phase.tasks);
    if (tasks.length === 0) return [];
    return tasks.some((task) => task.assigneeUserId)
      ? []
      : [{ code: 'TEAM_EMPTY' }];
  }

  private async checkListing(draft: CheckoutDraft): Promise<BlockingReason[]> {
    let project: { updatedAt?: string } | null;
    try {
      project = await this.summaryService.fetchProject(draft.listingId);
    } catch (err) {
      if (err instanceof NotFoundException) {
        return [{ code: 'LISTING_UNAVAILABLE' }];
      }
      if (err instanceof BadGatewayException) {
        throw new BadGatewayException({
          code: 'LISTING_CHECK_UNAVAILABLE',
          message: 'Listings service is unavailable',
        });
      }
      throw err;
    }
    if (!project) return [{ code: 'LISTING_UNAVAILABLE' }];

    const current = project.updatedAt ? new Date(project.updatedAt) : null;
    if (
      draft.sourceListingUpdatedAt &&
      current &&
      !Number.isNaN(current.getTime()) &&
      current.getTime() > new Date(draft.sourceListingUpdatedAt).getTime()
    ) {
      return [{ code: 'LISTING_CHANGED' }];
    }
    return [];
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

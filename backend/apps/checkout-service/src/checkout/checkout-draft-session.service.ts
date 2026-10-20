import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  CheckoutDraftValidationService,
  DraftPricing,
} from './checkout-draft-validation.service';
import { loadOwnedDraft } from './checkout-draft.util';
import { CheckoutDraft } from './entities/checkout-draft.entity';
import { CheckoutDraftPhaseEntity } from './entities/checkout-draft-phase.entity';
import {
  AppliedGiftCard,
  CheckoutSession,
} from './entities/checkout-session.entity';
import { CreateDraftSessionDto } from './dto/create-draft-session.dto';
import { CheckoutSummaryService } from './checkout-summary.service';
import { CheckoutDraftService } from './checkout-draft.service';
import { CheckoutDraftCodeService } from './checkout-draft-code.service';
import { CheckoutDraftPricingService } from './pricing/checkout-draft-pricing.service';
import { ApplyDraftCodeDto } from './dto/draft-code.dto';
import { promoDiscountCents } from './pricing/promo.adjustment';

export const SESSION_EXPIRY_MINUTES = 30;

const toCents = (dollars: number) => Math.round(dollars * 100);

type FrozenCodes = {
  appliedGiftCards: AppliedGiftCard[] | null;
  appliedPromoCode: string | null;
};

@Injectable()
export class CheckoutDraftSessionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly validationService: CheckoutDraftValidationService,
    private readonly summaryService: CheckoutSummaryService,
    private readonly draftService: CheckoutDraftService,
    private readonly codeService: CheckoutDraftCodeService,
    private readonly pricingService: CheckoutDraftPricingService,
  ) {}

  async getSession(clientId: string, sessionId: string) {
    const session = await this.dataSource.manager.findOne(CheckoutSession, {
      where: { id: sessionId, clientId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const project = await this.summaryService.fetchProject(session.listingId);
    const expired =
      session.status === 'pending' &&
      (await this.isPastExpiry(this.dataSource.manager, session.id));
    const draftSummary = await this.draftService.getSessionSummary(session.id);
    const projectCost = Number(session.projectCost);
    const { promo } = await this.codeService.listCodes({
      clientId,
      giftCardCodes: [],
      promoCode: session.appliedPromoCode,
    });
    const giftCardLock = await this.codeService.getGiftCardLock(clientId);

    return {
      sessionId: session.id,
      status: expired ? 'expired' : session.status,
      listingId: session.listingId,
      slug: (project?.slug as string | undefined) ?? null,
      contractId: session.contractId,
      projectCost,
      title: draftSummary?.title ?? null,
      mediaUrl: draftSummary?.mediaUrl ?? null,
      teamMemberCount: draftSummary?.teamMemberCount ?? null,
      durationDays: draftSummary?.durationDays ?? null,
      appliedGiftCards: session.appliedGiftCards ?? [],
      appliedPromoCode: session.appliedPromoCode,
      promo: promo
        ? {
            code: promo.code,
            status: promo.status,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            amount:
              promo.status === 'valid'
                ? promoDiscountCents(promo, toCents(projectCost)) / 100
                : 0,
          }
        : null,
      giftCardLockedUntil: giftCardLock.lockedUntil
        ? giftCardLock.lockedUntil.toISOString()
        : null,
    };
  }

  async applySessionCode(
    clientId: string,
    sessionId: string,
    dto: ApplyDraftCodeDto,
  ) {
    const draft = await this.loadActiveSessionDraft(clientId, sessionId);
    await this.codeService.applyCode(clientId, draft.id, dto, {
      keepSession: true,
    });
    return this.refreshSessionCodes(clientId, sessionId, draft.id);
  }

  async removeSessionCode(clientId: string, sessionId: string, code: string) {
    const draft = await this.loadActiveSessionDraft(clientId, sessionId);
    await this.codeService.removeCode(clientId, draft.id, code, {
      keepSession: true,
    });
    return this.refreshSessionCodes(clientId, sessionId, draft.id);
  }

  private async loadActiveSessionDraft(clientId: string, sessionId: string) {
    const session = await this.dataSource.manager.findOne(CheckoutSession, {
      where: { id: sessionId, clientId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status === 'success') {
      throw new ConflictException({
        code: 'SESSION_ALREADY_PAID',
        message: 'This checkout has already been paid',
      });
    }
    if (
      session.status !== 'pending' ||
      (await this.isPastExpiry(this.dataSource.manager, session.id))
    ) {
      throw new ConflictException({
        code: 'SESSION_NOT_ACTIVE',
        message: 'This checkout session is no longer active',
      });
    }
    const draft = await this.dataSource.manager.findOne(CheckoutDraft, {
      where: { sessionId, clientId },
    });
    if (!draft) throw new NotFoundException('Draft not found');
    return draft;
  }

  private async refreshSessionCodes(
    clientId: string,
    sessionId: string,
    draftId: string,
  ) {
    const pricing = await this.pricingService.getPricing(clientId, draftId);
    const draft = await this.dataSource.manager.findOneOrFail(CheckoutDraft, {
      where: { id: draftId },
    });
    const frozen = this.freezeCodes(pricing, draft);
    await this.dataSource.manager.update(CheckoutSession, sessionId, {
      appliedGiftCards: frozen.appliedGiftCards,
      appliedPromoCode: frozen.appliedPromoCode,
    });
    return this.getSession(clientId, sessionId);
  }

  async createSession(
    clientId: string,
    draftId: string,
    dto: CreateDraftSessionDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const draft = await loadOwnedDraft(manager, clientId, draftId, {
        lock: true,
      });
      this.validationService.assertCurrentVersion(draft, dto.version);

      const phases = await manager.find(CheckoutDraftPhaseEntity, {
        where: { draftId },
        relations: { tasks: true },
        order: { order: 'ASC', tasks: { order: 'ASC' } },
      });
      const { reasons, pricing } = await this.validationService.runChecks(
        clientId,
        draft,
        phases,
        dto.expectedTotal,
      );
      if (reasons.length > 0 || !pricing) {
        throw new UnprocessableEntityException({
          valid: false,
          blockingReasons: reasons,
        });
      }

      const sessionId = await this.resolveSession(
        manager,
        draft,
        clientId,
        pricing,
      );
      return { sessionId };
    });
  }

  private async resolveSession(
    manager: EntityManager,
    draft: CheckoutDraft,
    clientId: string,
    pricing: DraftPricing,
  ): Promise<string> {
    const frozen = this.freezeCodes(pricing, draft);

    if (draft.sessionId) {
      const existing = await manager.findOne(CheckoutSession, {
        where: { id: draft.sessionId },
      });
      if (existing?.status === 'success') {
        throw new ConflictException({
          code: 'SESSION_ALREADY_PAID',
          message: 'This checkout has already been paid',
        });
      }
      if (existing?.status === 'pending') {
        if (await this.isPastExpiry(manager, existing.id)) {
          await manager.update(CheckoutSession, existing.id, {
            status: 'expired',
          });
        } else if (this.matchesFrozen(existing, pricing, frozen)) {
          return existing.id;
        } else {
          await manager.update(CheckoutSession, existing.id, {
            status: 'cancelled',
          });
        }
      }
    }

    const created = await manager.save(
      manager.create(CheckoutSession, {
        clientId,
        listingId: draft.listingId,
        projectCost: pricing.projectCost,
        status: 'pending',
        appliedGiftCards: frozen.appliedGiftCards,
        appliedPromoCode: frozen.appliedPromoCode,
      }),
    );
    await manager.update(CheckoutDraft, draft.id, { sessionId: created.id });
    return created.id;
  }

  private freezeCodes(
    pricing: DraftPricing,
    draft: CheckoutDraft,
  ): FrozenCodes {
    const detailsOf = (key: string) =>
      pricing.lines.find((line) => line.key === key)?.details ?? [];
    const giftCards = detailsOf('giftCards').map((detail) => ({
      code: detail.code,
      amountUsed: Math.abs(detail.amount),
    }));
    return {
      appliedGiftCards: giftCards.length > 0 ? giftCards : null,
      appliedPromoCode:
        pricing.promoCode?.status === 'valid' ? draft.promoCode : null,
    };
  }

  private matchesFrozen(
    session: CheckoutSession,
    pricing: DraftPricing,
    frozen: FrozenCodes,
  ): boolean {
    return (
      toCents(Number(session.projectCost)) === toCents(pricing.projectCost) &&
      JSON.stringify(session.appliedGiftCards ?? null) ===
        JSON.stringify(frozen.appliedGiftCards) &&
      (session.appliedPromoCode ?? null) === frozen.appliedPromoCode
    );
  }

  private async isPastExpiry(
    manager: EntityManager,
    sessionId: string,
  ): Promise<boolean> {
    const rows: { expired: boolean }[] = await manager.query(
      `SELECT (now() - "createdAt") > make_interval(mins => $2) AS expired
       FROM "checkout"."sessions" WHERE "id" = $1`,
      [sessionId, SESSION_EXPIRY_MINUTES],
    );
    return rows[0]?.expired === true;
  }
}

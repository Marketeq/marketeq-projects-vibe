import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
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
import { Order } from './entities/order.entity';
import { Payment, PaymentMethod } from './entities/payment.entity';
import { CreateDraftSessionDto } from './dto/create-draft-session.dto';
import { CheckoutSummaryService } from './checkout-summary.service';
import { SavedCardsService } from './saved-cards.service';
import { CheckoutDraftService } from './checkout-draft.service';
import { CheckoutDraftCodeService } from './checkout-draft-code.service';
import { CheckoutDraftPricingService } from './pricing/checkout-draft-pricing.service';
import { ApplyDraftCodeDto } from './dto/draft-code.dto';
import { SetPaymentSelectionDto } from './dto/set-payment-selection.dto';
import { SetBalanceAppliedDto } from './dto/set-balance-applied.dto';
import { Wallet } from './entities/wallet.entity';
import { PaymentSelectionRegistry } from './payment-selection.registry';
import { promoDiscountCents } from './pricing/promo.adjustment';

export const SESSION_EXPIRY_MINUTES = 30;

const toCents = (dollars: number) => Math.round(dollars * 100);

const amountDueCents = (
  projectCost: number,
  promoAmount: number,
  giftCards: AppliedGiftCard[] | null,
) =>
  Math.max(
    toCents(projectCost) -
      toCents(promoAmount) -
      (giftCards ?? []).reduce(
        (total, giftCard) => total + toCents(Number(giftCard.amountUsed)),
        0,
      ),
    0,
  );

type FrozenCodes = {
  appliedGiftCards: AppliedGiftCard[] | null;
  appliedPromoCode: string | null;
};

@Injectable()
export class CheckoutDraftSessionService {
  private readonly logger = new Logger(CheckoutDraftSessionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly validationService: CheckoutDraftValidationService,
    private readonly summaryService: CheckoutSummaryService,
    private readonly draftService: CheckoutDraftService,
    private readonly codeService: CheckoutDraftCodeService,
    private readonly pricingService: CheckoutDraftPricingService,
    private readonly savedCardsService: SavedCardsService,
    private readonly paymentSelections: PaymentSelectionRegistry,
  ) {}

  async getSession(clientId: string, sessionId: string) {
    const session = await this.dataSource.manager.findOne(CheckoutSession, {
      where: { id: sessionId, clientId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const draftSummary = await this.draftService.getSessionSummary(session.id);
    const order = await this.dataSource.manager.findOne(Order, {
      where: { sessionId: session.id },
    });
    const listingId = order?.listingId ?? draftSummary?.listingId;
    if (!listingId) throw new NotFoundException('Session not found');
    const project = await this.summaryService.fetchProject(listingId);
    const expired =
      session.status === 'pending' &&
      (await this.isPastExpiry(this.dataSource.manager, session.id));
    const projectCost = Number(session.projectCost);
    const { promo } = await this.codeService.listCodes({
      clientId,
      giftCardCodes: [],
      promoCode: session.appliedPromoCode,
    });
    const giftCardLock = await this.codeService.getGiftCardLock(clientId);
    const paymentSelection = await this.readPaymentSelection(clientId, session);
    const promoAmount =
      promo && promo.status === 'valid'
        ? promoDiscountCents(promo, toCents(projectCost)) / 100
        : 0;
    const walletAmountUsed =
      Math.min(
        toCents(Number(session.walletAmountUsed ?? 0)),
        amountDueCents(projectCost, promoAmount, session.appliedGiftCards),
      ) / 100;

    return {
      sessionId: session.id,
      status: expired ? 'expired' : session.status,
      listingId,
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
      paymentSelection,
      walletAmountUsed,
    };
  }

  async setBalanceApplied(
    clientId: string,
    sessionId: string,
    dto: SetBalanceAppliedDto,
  ) {
    const session = await this.loadActiveSession(clientId, sessionId);
    const amountCents = toCents(dto.amount);

    if (amountCents > 0) {
      const wallet = await this.dataSource.manager.findOne(Wallet, {
        where: { userId: clientId },
      });
      if (amountCents > toCents(Number(wallet?.balance ?? 0))) {
        throw new UnprocessableEntityException({
          code: 'BALANCE_EXCEEDS_AVAILABLE',
          message: 'The amount is more than the available balance',
        });
      }

      const { promo } = await this.codeService.listCodes({
        clientId,
        giftCardCodes: [],
        promoCode: session.appliedPromoCode,
      });
      const promoAmount =
        promo && promo.status === 'valid'
          ? promoDiscountCents(promo, toCents(Number(session.projectCost))) /
            100
          : 0;
      if (
        amountCents >
        amountDueCents(
          Number(session.projectCost),
          promoAmount,
          session.appliedGiftCards,
        )
      ) {
        throw new UnprocessableEntityException({
          code: 'BALANCE_EXCEEDS_AMOUNT_DUE',
          message: 'The amount is more than the order total',
        });
      }
    }

    await this.dataSource.manager.update(CheckoutSession, session.id, {
      walletAmountUsed: amountCents / 100,
    });
    await this.syncPaymentAmount(clientId, session.id);
    return { walletAmountUsed: amountCents / 100 };
  }

  async setPaymentSelection(
    clientId: string,
    sessionId: string,
    dto: SetPaymentSelectionDto,
  ) {
    const session = await this.loadActiveSession(clientId, sessionId);
    const summary = await this.paymentSelections.resolve(
      dto.method,
      clientId,
      dto.id,
    );
    const amount = await this.amountDue(clientId, session);
    await this.replaceLines(
      session.id,
      amount > 0
        ? { method: dto.method, savedMethodId: dto.id, amount }
        : null,
    );
    return { method: dto.method, ...summary };
  }

  async clearPaymentSelection(clientId: string, sessionId: string) {
    const session = await this.loadActiveSession(clientId, sessionId);
    await this.replaceLines(session.id, null);
  }

  async submitPayment(clientId: string, sessionId: string) {
    const session = await this.loadActiveSession(clientId, sessionId);
    const selection = await this.readPaymentSelection(clientId, session);
    if (!selection && (await this.amountDue(clientId, session)) > 0) {
      throw new UnprocessableEntityException({
        code: 'PAYMENT_SELECTION_REQUIRED',
        message: 'Select a payment method before submitting',
      });
    }
    await this.dataSource.manager.update(CheckoutSession, session.id, {
      status: 'success',
    });
    return this.getSession(clientId, sessionId);
  }

  private async readPaymentSelection(clientId: string, session: CheckoutSession) {
    const line = await this.dataSource.manager.findOne(Payment, {
      where: { sessionId: session.id, phase: 'initial' },
      order: { createdAt: 'ASC' },
    });
    if (!line?.savedMethodId) return null;
    const summary = await this.paymentSelections.find(
      line.method,
      clientId,
      line.savedMethodId,
    );
    return summary ? { method: line.method, ...summary } : null;
  }

  private async amountDue(
    clientId: string,
    session: CheckoutSession,
  ): Promise<number> {
    const projectCost = Number(session.projectCost);
    const { promo } = await this.codeService.listCodes({
      clientId,
      giftCardCodes: [],
      promoCode: session.appliedPromoCode,
    });
    const promoAmount =
      promo && promo.status === 'valid'
        ? promoDiscountCents(promo, toCents(projectCost)) / 100
        : 0;
    const dueCents = amountDueCents(
      projectCost,
      promoAmount,
      session.appliedGiftCards,
    );
    const balanceCents = Math.min(
      toCents(Number(session.walletAmountUsed ?? 0)),
      dueCents,
    );
    return (dueCents - balanceCents) / 100;
  }

  private async replaceLines(
    sessionId: string,
    line: {
      method: PaymentMethod;
      savedMethodId: string;
      amount: number;
    } | null,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT "id" FROM "checkout"."sessions" WHERE "id" = $1 FOR UPDATE`,
        [sessionId],
      );
      await manager.delete(Payment, {
        sessionId,
        phase: 'initial',
        status: 'pending',
      });
      if (line) {
        await manager.insert(Payment, {
          sessionId,
          phase: 'initial',
          status: 'pending',
          ...line,
        });
      }
    });
  }

  private async syncPaymentAmount(
    clientId: string,
    sessionId: string,
  ): Promise<void> {
    const session = await this.dataSource.manager.findOneOrFail(
      CheckoutSession,
      { where: { id: sessionId } },
    );
    const amount = await this.amountDue(clientId, session);
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT "id" FROM "checkout"."sessions" WHERE "id" = $1 FOR UPDATE`,
        [sessionId],
      );
      const line = await manager.findOne(Payment, {
        where: { sessionId, phase: 'initial', status: 'pending' },
      });
      if (!line) return;
      if (amount > 0) {
        await manager.update(Payment, line.id, { amount });
      } else {
        await manager.delete(Payment, line.id);
      }
    });
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
    await this.loadActiveSession(clientId, sessionId);
    const draft = await this.dataSource.manager.findOne(CheckoutDraft, {
      where: { sessionId, clientId },
    });
    if (!draft) throw new NotFoundException('Draft not found');
    return draft;
  }

  private async loadActiveSession(clientId: string, sessionId: string) {
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
    return session;
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
    await this.syncPaymentAmount(clientId, sessionId);
    return this.getSession(clientId, sessionId);
  }

  async createSession(
    clientId: string,
    draftId: string,
    dto: CreateDraftSessionDto,
  ) {
    const result = await this.dataSource.transaction(async (manager) => {
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
    await this.ensureStripeCustomer(clientId);
    return result;
  }

  private async ensureStripeCustomer(clientId: string): Promise<void> {
    try {
      if (await this.savedCardsService.findCustomer(clientId)) return;
      const contact = await this.summaryService.fetchUserContact(clientId);
      await this.savedCardsService.getOrCreateCustomer(clientId, contact);
    } catch (err) {
      this.logger.warn(
        `Failed to set up Stripe customer for ${clientId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new BadGatewayException({
        code: 'CUSTOMER_UNAVAILABLE',
        message: 'Your payment account could not be set up',
      });
    }
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

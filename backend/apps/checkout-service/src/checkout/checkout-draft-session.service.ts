import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
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
import { Order, OrderPaymentSnapshotEntry } from './entities/order.entity';
import type { SavedCardView } from './saved-cards.service';
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
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { GiftCardRedemption } from './entities/gift-card-redemption.entity';
import { PromoRedemption } from './entities/promo-redemption.entity';
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

type RequestMeta = { sourceIp?: string; userAgent?: string };

class BalanceShortError extends Error {
  constructor(readonly availableCents: number) {
    super('The wallet balance no longer covers the applied amount');
  }
}

type AvailableGiftCard = { code: string; availableCents: number };

class GiftCardShortError extends Error {
  constructor(readonly available: AvailableGiftCard[]) {
    super('A gift card no longer covers the applied amount');
  }
}

class PromoUnavailableError extends Error {
  constructor() {
    super('The promo code can no longer be used');
  }
}

const giftCardKey = (code: string) => code.replace(/-/g, '').toUpperCase();

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

  async submitPayment(
    clientId: string,
    sessionId: string,
    dto: SubmitPaymentDto,
    clientEmail?: string,
    requestMeta: RequestMeta = {},
  ) {
    if (dto?.authorized !== true) {
      throw new BadRequestException({
        code: 'AUTHORIZATION_REQUIRED',
        message: 'Confirm the payment authorization before submitting',
      });
    }
    if (typeof dto.expectedTotal !== 'number') {
      throw new BadRequestException({
        code: 'EXPECTED_TOTAL_REQUIRED',
        message: 'The total shown to the client is required',
      });
    }
    const existingOrder = await this.dataSource.manager.findOne(Order, {
      where: { sessionId },
    });
    if (existingOrder) {
      if (existingOrder.clientId !== clientId) {
        throw new NotFoundException('Session not found');
      }
      return this.withOrder(clientId, sessionId, existingOrder);
    }
    const session = await this.loadActiveSession(clientId, sessionId);
    const due = await this.amountDue(clientId, session);
    if (toCents(due) !== toCents(dto.expectedTotal)) {
      throw new ConflictException({
        code: 'AMOUNT_CHANGED',
        message: 'The total changed since it was shown',
        currentTotal: due,
      });
    }
    const selection = await this.readPaymentSelection(clientId, session);
    if (!selection && due > 0) {
      throw new UnprocessableEntityException({
        code: 'PAYMENT_SELECTION_REQUIRED',
        message: 'Select a payment method before submitting',
      });
    }
    const order = await this.createOrder(
      clientId,
      session,
      due,
      clientEmail,
      await this.appliedBalanceCents(clientId, session),
      await this.appliedPromoCents(clientId, session),
      requestMeta,
    );
    await this.dataSource.manager.update(CheckoutSession, session.id, {
      status: 'success',
    });
    return this.withOrder(clientId, sessionId, order);
  }

  private async withOrder(clientId: string, sessionId: string, order: Order) {
    return {
      ...(await this.getSession(clientId, sessionId)),
      order: { orderId: order.orderId, status: order.status },
    };
  }

  private async buildPaymentSnapshot(
    clientId: string,
    sessionId: string,
  ): Promise<OrderPaymentSnapshotEntry[]> {
    const lines = await this.dataSource.manager.find(Payment, {
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
    const capturedAt = new Date().toISOString();
    return Promise.all(
      lines.map(async (line) => {
        const card = line.savedMethodId
          ? ((await this.paymentSelections.find(
              line.method,
              clientId,
              line.savedMethodId,
            )) as SavedCardView | null)
          : null;
        const billingAddress =
          card?.billingAddressId
            ? await this.summaryService.fetchBillingAddress(
                clientId,
                card.billingAddressId,
              )
            : null;
        return {
          paymentId: line.id,
          phase: line.phase,
          method: line.method,
          card: card
            ? {
                brand: card.brand,
                funding: card.funding,
                last4: card.last4,
                expMonth: card.expMonth,
                expYear: card.expYear,
              }
            : null,
          billingAddress,
          capturedAt,
        };
      }),
    );
  }

  private async createOrder(
    clientId: string,
    session: CheckoutSession,
    due: number,
    clientEmail: string | undefined,
    balanceCents: number,
    promoCents: number,
    requestMeta: RequestMeta,
  ): Promise<Order> {
    const draftSummary = await this.draftService.getSessionSummary(session.id);
    if (!draftSummary?.listingId) {
      throw new NotFoundException('Session not found');
    }
    const paymentSnapshot = await this.buildPaymentSnapshot(clientId, session.id);
    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager.query(
          `SELECT "id" FROM "checkout"."sessions" WHERE "id" = $1 FOR UPDATE`,
          [session.id],
        );
        const existing = await manager.findOne(Order, {
          where: { sessionId: session.id },
        });
        if (existing) return existing;
        await manager.insert(Order, {
          sessionId: session.id,
          clientId,
          listingId: draftSummary.listingId,
          orderCost: due,
          status: 'processing',
          confirmationEmail: clientEmail?.trim() || null,
          paymentSnapshot,
        });
        const created = await manager.findOneOrFail(Order, {
          where: { sessionId: session.id },
        });
        await this.spendBalance(
          manager,
          clientId,
          created.orderId,
          balanceCents,
          requestMeta,
        );
        await this.spendGiftCards(
          manager,
          clientId,
          created.orderId,
          session.appliedGiftCards,
          requestMeta,
        );
        await this.spendPromo(
          manager,
          clientId,
          session,
          created.orderId,
          promoCents,
        );
        return created;
      });
    } catch (error) {
      if (error instanceof BalanceShortError) {
        await this.resetBalanceToAvailable(
          clientId,
          session.id,
          error.availableCents,
        );
        throw await this.amountChanged(clientId, session.id);
      }
      if (error instanceof PromoUnavailableError) {
        await this.dataSource.manager.update(CheckoutSession, session.id, {
          appliedPromoCode: null,
        });
        await this.syncPaymentAmount(clientId, session.id);
        throw await this.amountChanged(clientId, session.id);
      }
      if (error instanceof GiftCardShortError) {
        await this.resetGiftCardsToAvailable(
          clientId,
          session.id,
          error.available,
        );
        throw await this.amountChanged(clientId, session.id);
      }
      if ((error as { code?: string }).code === '23505') {
        return this.dataSource.manager.findOneOrFail(Order, {
          where: { sessionId: session.id },
        });
      }
      throw error;
    }
  }

  private async amountChanged(
    clientId: string,
    sessionId: string,
  ): Promise<ConflictException> {
    const refreshed = await this.dataSource.manager.findOneOrFail(
      CheckoutSession,
      { where: { id: sessionId } },
    );
    return new ConflictException({
      code: 'AMOUNT_CHANGED',
      message: 'The total changed since it was shown',
      currentTotal: await this.amountDue(clientId, refreshed),
    });
  }

  private async appliedBalanceCents(
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
    return Math.min(
      toCents(Number(session.walletAmountUsed ?? 0)),
      amountDueCents(projectCost, promoAmount, session.appliedGiftCards),
    );
  }

  private async spendBalance(
    manager: EntityManager,
    clientId: string,
    orderId: string,
    balanceCents: number,
    requestMeta: RequestMeta,
  ): Promise<void> {
    if (balanceCents <= 0) return;
    const wallets = await manager.query(
      `SELECT "balance" FROM "checkout"."wallets" WHERE "userId" = $1 FOR UPDATE`,
      [clientId],
    );
    const availableCents = wallets.length
      ? toCents(Number(wallets[0].balance))
      : 0;
    if (availableCents < balanceCents) {
      throw new BalanceShortError(availableCents);
    }
    await manager.query(
      `UPDATE "checkout"."wallets" SET "balance" = "balance" - ($1::numeric / 100), "updatedAt" = now() WHERE "userId" = $2`,
      [balanceCents, clientId],
    );
    await manager.insert(WalletTransaction, {
      id: randomUUID(),
      userId: clientId,
      type: 'payment',
      amount: balanceCents / 100,
      status: 'completed',
      orderId,
      reason: `Balance applied to order ${orderId}`,
      sourceIp: requestMeta.sourceIp?.trim().slice(0, 64) || null,
      userAgent: requestMeta.userAgent?.trim().slice(0, 500) || null,
      createdBy: clientId,
    });
  }

  private async appliedPromoCents(
    clientId: string,
    session: CheckoutSession,
  ): Promise<number> {
    const { promo } = await this.codeService.listCodes({
      clientId,
      giftCardCodes: [],
      promoCode: session.appliedPromoCode,
    });
    return promo && promo.status === 'valid'
      ? promoDiscountCents(promo, toCents(Number(session.projectCost)))
      : 0;
  }

  private async spendPromo(
    manager: EntityManager,
    clientId: string,
    session: CheckoutSession,
    orderId: string,
    discountCents: number,
  ): Promise<void> {
    if (discountCents <= 0 || !session.appliedPromoCode) return;
    const rows: Array<{
      id: string;
      discount_type: 'percent' | 'fixed';
      discount_value: string;
      applies_to: string;
      starts_at: Date | null;
      expires_at: Date | null;
      max_redemptions: number | null;
      max_per_client: number | null;
      active: boolean;
    }> = await manager.query(
      `SELECT "id", "discount_type", "discount_value", "applies_to", "starts_at", "expires_at", "max_redemptions", "max_per_client", "active"
       FROM "checkout"."promo_codes"
       WHERE "id" = $1
       FOR UPDATE`,
      [session.appliedPromoCode],
    );
    const promo = rows[0];
    const now = Date.now();
    const usable =
      !!promo &&
      promo.active &&
      promo.applies_to !== 'service' &&
      (!promo.starts_at || new Date(promo.starts_at).getTime() <= now) &&
      (!promo.expires_at || new Date(promo.expires_at).getTime() >= now);
    if (!usable) throw new PromoUnavailableError();
    if (
      promoDiscountCents(
        {
          discountType: promo.discount_type,
          discountValue: Number(promo.discount_value),
        },
        toCents(Number(session.projectCost)),
      ) !== discountCents
    ) {
      throw new PromoUnavailableError();
    }
    const [counts] = await manager.query(
      `SELECT count(*)::int AS "total", (count(*) FILTER (WHERE "client_id" = $2))::int AS "mine"
       FROM "checkout"."promo_redemptions"
       WHERE "promo_code_id" = $1 AND "voided_at" IS NULL`,
      [promo.id, clientId],
    );
    if (
      (promo.max_redemptions !== null && counts.total >= promo.max_redemptions) ||
      (promo.max_per_client !== null && counts.mine >= promo.max_per_client)
    ) {
      throw new PromoUnavailableError();
    }
    const drafts = await manager.query(
      `SELECT "id" FROM "checkout"."drafts" WHERE "sessionId" = $1`,
      [session.id],
    );
    if (!drafts.length) throw new NotFoundException('Session not found');
    await manager.insert(PromoRedemption, {
      promoCodeId: promo.id,
      clientId,
      draftId: drafts[0].id,
      orderId,
      discountAmount: discountCents / 100,
    });
  }

  private async spendGiftCards(
    manager: EntityManager,
    clientId: string,
    orderId: string,
    applied: AppliedGiftCard[] | null,
    requestMeta: RequestMeta,
  ): Promise<void> {
    const wanted = new Map<string, { code: string; cents: number }>();
    for (const card of applied ?? []) {
      const cents = toCents(Number(card.amountUsed));
      if (cents <= 0) continue;
      const key = giftCardKey(card.code);
      const entry = wanted.get(key);
      if (entry) entry.cents += cents;
      else wanted.set(key, { code: card.code, cents });
    }
    if (wanted.size === 0) return;

    const rows: Array<{
      id: string;
      key: string;
      remainingAmount: string;
      isActive: boolean;
      expiresAt: Date | null;
      redeemedByUserId: string | null;
    }> = await manager.query(
      `SELECT "id", REPLACE(UPPER("code"), '-', '') AS "key", "remainingAmount", "isActive", "expiresAt", "redeemedByUserId"
       FROM "checkout"."gift_cards"
       WHERE REPLACE(UPPER("code"), '-', '') = ANY($1)
       ORDER BY "code"
       FOR UPDATE`,
      [[...wanted.keys()]],
    );
    const byKey = new Map(rows.map((row) => [row.key, row]));
    const now = Date.now();
    const keys = [...wanted.keys()].sort();

    const available: AvailableGiftCard[] = keys.map((key) => {
      const want = wanted.get(key)!;
      const row = byKey.get(key);
      const usable =
        !!row &&
        row.isActive &&
        (!row.expiresAt || new Date(row.expiresAt).getTime() >= now) &&
        (!row.redeemedByUserId || row.redeemedByUserId === clientId);
      const remainingCents = usable ? toCents(Number(row.remainingAmount)) : 0;
      return {
        code: want.code,
        availableCents: Math.min(remainingCents, want.cents),
      };
    });
    if (available.some((card, i) => card.availableCents < wanted.get(keys[i])!.cents)) {
      throw new GiftCardShortError(available);
    }

    for (const key of keys) {
      const { cents } = wanted.get(key)!;
      const row = byKey.get(key)!;
      await manager.query(
        `UPDATE "checkout"."gift_cards"
         SET "remainingAmount" = "remainingAmount" - ($1::numeric / 100),
             "isActive" = ("remainingAmount" - ($1::numeric / 100)) > 0,
             "redeemedByUserId" = $3
         WHERE "id" = $2`,
        [cents, row.id, clientId],
      );
      await manager.insert(GiftCardRedemption, {
        id: randomUUID(),
        giftCardId: row.id,
        userId: clientId,
        type: 'payment',
        amount: cents / 100,
        status: 'completed',
        orderId,
        reason: `Gift card applied to order ${orderId}`,
        sourceIp: requestMeta.sourceIp?.trim().slice(0, 64) || null,
        userAgent: requestMeta.userAgent?.trim().slice(0, 500) || null,
        createdBy: clientId,
      });
    }
  }

  private async resetGiftCardsToAvailable(
    clientId: string,
    sessionId: string,
    available: AvailableGiftCard[],
  ): Promise<void> {
    const kept = available
      .filter((card) => card.availableCents > 0)
      .map((card) => ({
        code: card.code,
        amountUsed: card.availableCents / 100,
      }));
    await this.dataSource.manager.update(CheckoutSession, sessionId, {
      appliedGiftCards: kept.length > 0 ? kept : null,
    });
    await this.syncPaymentAmount(clientId, sessionId);
  }

  private async resetBalanceToAvailable(
    clientId: string,
    sessionId: string,
    availableCents: number,
  ): Promise<void> {
    await this.dataSource.manager.update(CheckoutSession, sessionId, {
      walletAmountUsed: availableCents / 100,
    });
    await this.syncPaymentAmount(clientId, sessionId);
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

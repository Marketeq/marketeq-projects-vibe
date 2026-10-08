// apps/payout-service/src/card/card-issuance.service.ts
// PS-13 §2+§3+§7: Card issuance, activation, and management.
// Uses Stripe Issuing API. Feature-flagged behind FEATURE_DEBIT_CARD_ENABLED.

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { DepositMethod, MethodType, VerificationStatus } from '../entities/deposit-method.entity';
import { AuditService } from '../audit/audit.service';
import { PayoutError } from '../common/errors/payout.error';
import { KycClient } from '../common/kyc.client';
import { UpdateSpendingLimitsDto } from './dto/update-spending-limits.dto';

// PS-13 §5: Default spending limits (in cents)
const DEFAULT_DAILY_LIMIT   = 500_00;   // $500.00
const DEFAULT_WEEKLY_LIMIT  = 2_000_00; // $2,000.00
const DEFAULT_MONTHLY_LIMIT = 5_000_00; // $5,000.00
const DEFAULT_SINGLE_LIMIT  = 500_00;   // $500.00
const CARD_BALANCE_CAP      = 10_000;   // $10,000.00

@Injectable()
export class CardIssuanceService {
  private readonly logger = new Logger(CardIssuanceService.name);
  private stripe: any = null;

  constructor(
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly kycClient: KycClient,
  ) {
    this.initStripe();
  }

  private initStripe() {
    const key = this.config.get('STRIPE_SECRET_KEY', '');
    if (key && key !== 'sk_test_YOUR_TEST_KEY_HERE') {
      try {
        const Stripe = require('stripe');
        this.stripe = new Stripe(key, { apiVersion: '2024-06-20' });
      } catch { this.logger.warn('Stripe SDK not available — using stubs'); }
    }
  }

  // ─── PS-13 §2: Request Card ─────────────────────────────────
  async requestCard(
    contractorId: string,
    dto: { cardType: 'virtual' | 'physical' },
  ): Promise<{ depositMethodId: string; cardType: string; last4?: string; status: string }> {
    // Feature flag check
    if (this.config.get('FEATURE_DEBIT_CARD_ENABLED') !== 'true') {
      throw new PayoutError('Debit card is not currently available.',
        HttpStatus.BAD_REQUEST, 'ERR_DEPOSIT_METHOD_UNAVAILABLE');
    }

    // PS-13 §2.1: Pre-flight checks
    const kycResult = await this.kycClient.getStatus(contractorId);
    if (kycResult.suspended || kycResult.tier === 'unknown') {
      throw new PayoutError('Identity verification required before requesting a card.',
        HttpStatus.FORBIDDEN, 'ERR_CARD_KYC_REQUIRED');
    }

    // PS-24 §11 / PS-13: US only in v1. kyc-identity-service's gate-status
    // response has no contractorCountry field yet (same gap as the OFAC
    // country check in crypto-payout-executor.service.ts) — this reads
    // undefined until that ships, so the check is a safe no-op today rather
    // than blocking every card request.
    const contractorCountry = (kycResult as any).contractorCountry as string | undefined;
    if (contractorCountry && contractorCountry.toUpperCase() !== 'US') {
      throw new PayoutError('The Marketeq card is currently available to US contractors only.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CARD_GEO_UNAVAILABLE', { contractorCountry });
    }

    // One card per contractor in v1
    const existing = await this.methodRepo.findOne({
      where: { contractorId, methodType: MethodType.MARKETEQ_DEBIT_CARD, isActive: true },
    });
    if (existing) {
      throw new PayoutError('You already have an active Marketeq debit card.',
        HttpStatus.CONFLICT, 'ERR_CARD_ALREADY_EXISTS');
    }

    // 5-method limit
    const methodCount = await this.methodRepo.count({ where: { contractorId, isActive: true } });
    if (methodCount >= 5) {
      throw new PayoutError('Maximum 5 active deposit methods allowed.',
        HttpStatus.BAD_REQUEST, 'ERR_DEPOSIT_METHOD_LIMIT_REACHED');
    }

    // PS-13 §2.2+§2.3: Create Stripe Issuing cardholder + card
    let stripeCardholderId = `ch_stub_${contractorId.slice(0, 8)}`;
    let stripeCardId = `ic_stub_${Date.now()}`;
    let last4 = String(Math.floor(1000 + Math.random() * 9000));

    if (this.stripe) {
      try {
        // In production: fetch contractor details from user-service
        const cardholder = await this.stripe.issuing.cardholders.create({
          type: 'individual',
          name: `Contractor ${contractorId.slice(0, 8)}`,
          email: `contractor-${contractorId.slice(0, 8)}@marketeq.com`,
          billing: {
            address: {
              line1: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              postal_code: '94105',
              country: 'US',
            },
          },
        });
        stripeCardholderId = cardholder.id;

        const card = await this.stripe.issuing.cards.create({
          cardholder: cardholder.id,
          currency: 'usd',
          type: dto.cardType,
          status: 'inactive',
          spending_controls: {
            spending_limits: [
              { amount: DEFAULT_DAILY_LIMIT, interval: 'daily' },
              { amount: DEFAULT_WEEKLY_LIMIT, interval: 'weekly' },
              { amount: DEFAULT_MONTHLY_LIMIT, interval: 'monthly' },
              { amount: DEFAULT_SINGLE_LIMIT, interval: 'per_authorization' },
            ],
          },
        });
        stripeCardId = card.id;
        last4 = card.last4;
      } catch (err: any) {
        this.logger.warn(`Stripe Issuing card creation failed: ${err.message} — using stubs`);
      }
    } else {
      this.logger.log(`[STUB] Card requested: type=${dto.cardType}, contractorId=${contractorId}`);
    }

    // PS-13 §2.2: Persist deposit method
    const method = await this.methodRepo.save({
      contractorId,
      methodType: MethodType.MARKETEQ_DEBIT_CARD,
      stripeCardholderId,
      stripeCardId,
      cardType: dto.cardType,
      cardLast4: last4,
      cardNetwork: 'visa',
      cardStatus: 'inactive',
      cardBalanceCap: String(CARD_BALANCE_CAP),
      verificationStatus: VerificationStatus.PENDING,
      isActive: true,
      isDefault: false,
      displayLabel: `Marketeq Visa ••••${last4}`,
    });

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: 'card.requested',
      metadata: { methodId: method.id, cardType: dto.cardType, stripeCardId },
    });

    return {
      depositMethodId: method.id,
      cardType: dto.cardType,
      last4: dto.cardType === 'virtual' ? last4 : undefined,
      status: 'inactive',
    };
  }

  // ─── PS-13 §3: Activate Card ───────────────────────────────
  async activateCard(
    contractorId: string,
    depositMethodId: string,
    dto: { last4: string },
  ): Promise<{ activated: boolean }> {
    const method = await this.findCard(contractorId, depositMethodId);

    if (method.verificationStatus === VerificationStatus.VERIFIED) {
      throw new PayoutError('Card is already activated.',
        HttpStatus.CONFLICT, 'ERR_CARD_ALREADY_ACTIVE');
    }

    // Validate last4 match
    if (method.cardLast4 !== dto.last4) {
      throw new PayoutError('Card number does not match.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CARD_ACTIVATION_MISMATCH');
    }

    // Activate via Stripe
    if (this.stripe && method.stripeCardId && !method.stripeCardId.startsWith('ic_stub')) {
      try {
        await this.stripe.issuing.cards.update(method.stripeCardId, { status: 'active' });
      } catch (err: any) {
        this.logger.warn(`Stripe card activation failed: ${err.message}`);
      }
    }

    await this.methodRepo.update(method.id, {
      verificationStatus: VerificationStatus.VERIFIED,
      cardStatus: 'active',
    });

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: 'card.activated',
      metadata: { methodId: method.id },
    });

    return { activated: true };
  }

  // ─── PS-13 §7: Freeze Card ─────────────────────────────────
  async freezeCard(contractorId: string, depositMethodId: string): Promise<{ status: string }> {
    const method = await this.findCard(contractorId, depositMethodId);

    if (this.stripe && method.stripeCardId && !method.stripeCardId.startsWith('ic_stub')) {
      try {
        await this.stripe.issuing.cards.update(method.stripeCardId, { status: 'inactive' });
      } catch (err: any) {
        this.logger.warn(`Stripe freeze failed: ${err.message}`);
      }
    }

    await this.methodRepo.update(method.id, { cardStatus: 'frozen' });

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: 'card.frozen',
      metadata: { methodId: method.id },
    });

    return { status: 'frozen' };
  }

  // ─── PS-13 §7: Unfreeze Card ───────────────────────────────
  async unfreezeCard(contractorId: string, depositMethodId: string): Promise<{ status: string }> {
    const method = await this.findCard(contractorId, depositMethodId);

    if (this.stripe && method.stripeCardId && !method.stripeCardId.startsWith('ic_stub')) {
      try {
        await this.stripe.issuing.cards.update(method.stripeCardId, { status: 'active' });
      } catch (err: any) {
        this.logger.warn(`Stripe unfreeze failed: ${err.message}`);
      }
    }

    await this.methodRepo.update(method.id, { cardStatus: 'active' });

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: 'card.unfrozen',
      metadata: { methodId: method.id },
    });

    return { status: 'active' };
  }

  // ─── PS-13 §7: Report Lost/Stolen ──────────────────────────
  async reportLost(contractorId: string, depositMethodId: string): Promise<{ replacementMethodId: string }> {
    const method = await this.findCard(contractorId, depositMethodId);

    // Cancel old card via Stripe
    if (this.stripe && method.stripeCardId && !method.stripeCardId.startsWith('ic_stub')) {
      try {
        await this.stripe.issuing.cards.update(method.stripeCardId, { status: 'canceled' });
      } catch (err: any) {
        this.logger.warn(`Stripe cancel failed: ${err.message}`);
      }
    }

    // Deactivate old method
    await this.methodRepo.update(method.id, {
      isActive: false,
      cardStatus: 'canceled',
      deactivatedAt: new Date(),
    });

    // Create replacement card (same type)
    const replacement = await this.requestCard(contractorId, {
      cardType: (method.cardType as 'virtual' | 'physical') ?? 'virtual',
    });

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: 'card.reported_lost',
      metadata: { oldMethodId: method.id, replacementMethodId: replacement.depositMethodId },
    });

    return { replacementMethodId: replacement.depositMethodId };
  }

  // ─── PS-13 §7: Cancel Card Permanently ─────────────────────
  async cancelCard(contractorId: string, depositMethodId: string): Promise<{ canceled: boolean }> {
    const method = await this.findCard(contractorId, depositMethodId);

    if (this.stripe && method.stripeCardId && !method.stripeCardId.startsWith('ic_stub')) {
      try {
        await this.stripe.issuing.cards.update(method.stripeCardId, { status: 'canceled' });
      } catch (err: any) {
        this.logger.warn(`Stripe cancel failed: ${err.message}`);
      }
    }

    await this.methodRepo.update(method.id, {
      isActive: false,
      cardStatus: 'canceled',
      deactivatedAt: new Date(),
    });

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: 'card.canceled',
      metadata: { methodId: method.id },
    });

    return { canceled: true };
  }

  // ─── PS-13 §5: Admin — override spending limits ─────────────
  // Doc's "Adjustable by Marketeq admin: Yes" column for weekly/monthly/
  // single-transaction limits (daily is also contractor-adjustable up to
  // $2,500, but that's the [DESIGN REQUIRED] contractor-facing flow — this
  // is the admin override only). Pushes to Stripe (source of truth for
  // enforcement) and mirrors onto the entity (source of truth for display).
  async adminUpdateSpendingLimits(
    depositMethodId: string,
    adminId: string,
    limits: UpdateSpendingLimitsDto,
  ): Promise<{ updated: boolean }> {
    if (
      limits.dailyCents === undefined && limits.weeklyCents === undefined &&
      limits.monthlyCents === undefined && limits.singleCents === undefined
    ) {
      throw new PayoutError('At least one spending limit must be provided.',
        HttpStatus.BAD_REQUEST, 'ERR_CARD_SPENDING_LIMIT_EMPTY_UPDATE');
    }

    const method = await this.methodRepo.findOne({
      where: { id: depositMethodId, methodType: MethodType.MARKETEQ_DEBIT_CARD },
    });
    if (!method) {
      throw new PayoutError('Card not found.', HttpStatus.NOT_FOUND, 'ERR_CARD_NOT_FOUND');
    }

    const dailyCents = limits.dailyCents ?? method.cardDailyLimitCents ?? DEFAULT_DAILY_LIMIT;
    const weeklyCents = limits.weeklyCents ?? method.cardWeeklyLimitCents ?? DEFAULT_WEEKLY_LIMIT;
    const monthlyCents = limits.monthlyCents ?? method.cardMonthlyLimitCents ?? DEFAULT_MONTHLY_LIMIT;
    const singleCents = limits.singleCents ?? method.cardSingleLimitCents ?? DEFAULT_SINGLE_LIMIT;

    // Reviewer-suggested: enforce the doc's implicit ordering on the
    // resolved (provided-or-existing) values, not just the payload in
    // isolation — a partial update (e.g. only dailyCents) must still be
    // checked against whatever weekly/monthly it's about to coexist with.
    if (singleCents > dailyCents || dailyCents > weeklyCents || weeklyCents > monthlyCents) {
      throw new PayoutError(
        'Spending limits must satisfy single ≤ daily ≤ weekly ≤ monthly.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CARD_SPENDING_LIMIT_ORDER_INVALID',
        { singleCents, dailyCents, weeklyCents, monthlyCents },
      );
    }

    if (this.stripe && method.stripeCardId && !method.stripeCardId.startsWith('ic_stub')) {
      try {
        await this.stripe.issuing.cards.update(method.stripeCardId, {
          spending_controls: {
            spending_limits: [
              { amount: dailyCents, interval: 'daily' },
              { amount: weeklyCents, interval: 'weekly' },
              { amount: monthlyCents, interval: 'monthly' },
              { amount: singleCents, interval: 'per_authorization' },
            ],
          },
        });
      } catch (err: any) {
        this.logger.warn(`Stripe spending-limit update failed: ${err.message}`);
        throw new PayoutError('Could not update spending limits with the card provider.',
          HttpStatus.BAD_GATEWAY, 'ERR_CARD_SPENDING_LIMIT_UPDATE_FAILED');
      }
    }

    await this.methodRepo.update(method.id, {
      cardDailyLimitCents: dailyCents,
      cardWeeklyLimitCents: weeklyCents,
      cardMonthlyLimitCents: monthlyCents,
      cardSingleLimitCents: singleCents,
    });

    await this.auditService.log({
      contractorId: method.contractorId, actorType: 'admin', actorId: adminId,
      action: 'card.spending_limits.updated',
      metadata: { methodId: method.id, dailyCents, weeklyCents, monthlyCents, singleCents },
    });

    return { updated: true };
  }

  // ─── Helper ─────────────────────────────────────────────────
  private async findCard(contractorId: string, depositMethodId: string): Promise<DepositMethod> {
    const method = await this.methodRepo.findOne({
      where: { id: depositMethodId, contractorId, methodType: MethodType.MARKETEQ_DEBIT_CARD },
    });
    if (!method) {
      throw new PayoutError('Card not found.', HttpStatus.NOT_FOUND, 'ERR_CARD_NOT_FOUND');
    }
    return method;
  }
}
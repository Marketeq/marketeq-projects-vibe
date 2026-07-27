import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository }          from 'typeorm';
import { ConfigService }       from '@nestjs/config';
import { DepositMethod, MethodType, VerificationStatus } from '../entities/deposit-method.entity';
import { DepositMethodVerification } from '../entities/deposit-method-verification.entity';
import { AuditService }        from '../audit/audit.service';
import { PayoutError }         from '../common/errors/payout.error';

@Injectable()
export class StripeProvider {
  private readonly logger = new Logger(StripeProvider.name);
  private stripe: any = null;
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly fcReturnUrl: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    @InjectRepository(DepositMethodVerification)
    private readonly verifyRepo: Repository<DepositMethodVerification>,
    private readonly auditService: AuditService,
  ) {
    this.secretKey = this.config.get('STRIPE_SECRET_KEY', '');
    this.webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET', '');
    this.fcReturnUrl = this.config.get('STRIPE_FC_RETURN_URL', 'http://localhost:3000/deposit-methods/stripe/callback');
    this.initStripe();
  }

  // A real Stripe secret key is sk_test_/sk_live_ followed by ~24+ alphanumeric
  // characters. Checking only for the scaffold's exact placeholder string
  // (sk_test_YOUR...) let a *different* placeholder (e.g. "sk_test_...") pass
  // as "configured", causing real (and doomed) Stripe API calls in dev.
  private isRealStripeKey(): boolean {
    return /^sk_(test|live)_[A-Za-z0-9]{20,}$/.test(this.secretKey);
  }

  private initStripe() {
    try {
      const Stripe = require('stripe');
      this.stripe = new Stripe(this.secretKey, { apiVersion: '2024-06-20', typescript: true });
      this.logger.log('Stripe SDK initialized');
    } catch {
      this.logger.warn('Stripe SDK not available — running in stub mode');
    }
  }

  // ─── Step 1: Create Financial Connections Session ─────────────
  async initiateBankStripe(contractorId: string) {
    if (!this.stripe || !this.isRealStripeKey()) {
      // Dev mode — return mock session
      const mockSessionId = `fcsess_mock_${Date.now()}`;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await this.verifyRepo.save({
        contractorId,
        verificationType: 'stripe_fc',
        oauthState: mockSessionId,
        expiresAt,
        status: VerificationStatus.PENDING,
      } as any);

      this.logger.warn('[DEV] Stripe FC session mocked — no real Stripe call');
      return {
        clientSecret: `${mockSessionId}_secret_mock`,
        sessionId: mockSessionId,
        expiresAt: expiresAt.toISOString(),
        mode: 'mock',
      };
    }

    // Production: create real FC session
    // return_url is documented as optional, "for webview integrations only"
    // — the frontend here uses the standard Stripe.js browser flow
    // (stripe.collectFinancialConnectionsAccounts()), not a native webview,
    // so it's omitted unless a real https:// URL is configured. Stripe's API
    // hard-rejects non-HTTPS values ("URLs must begin with https"), which
    // broke local dev where STRIPE_FC_RETURN_URL defaults to localhost.
    const session = await this.stripe.financialConnections.sessions.create({
      account_holder: { type: 'customer', customer: await this.getOrCreateCustomer(contractorId) },
      permissions: ['payment_method', 'balances'],
      filters: { countries: ['US'] },
      ...(this.fcReturnUrl.startsWith('https://') ? { return_url: this.fcReturnUrl } : {}),
    });

    await this.verifyRepo.save({
      contractorId,
      verificationType: 'stripe_fc',
      oauthState: session.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      status: VerificationStatus.PENDING,
    } as any);

    return {
      clientSecret: session.client_secret,
      sessionId: session.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  // ─── Step 3: Finalise account link ────────────────────────────
  async finaliseBankStripe(contractorId: string, sessionId: string, linkedAccountId: string) {
    if (!this.stripe || !this.isRealStripeKey()) {
      // Dev mode — create method directly as verified
      const method = await this.methodRepo.save({
        contractorId,
        methodType: MethodType.BANK_STRIPE,
        stripeAccountId: linkedAccountId || `mock_acct_${Date.now()}`,
        bankAccountName: 'Mock Bank',
        bankAccountLast4: '4242',
        bankCountry: 'US',
        bankCurrency: 'USD',
        displayLabel: 'Mock Bank ••••4242',
        verificationStatus: VerificationStatus.VERIFIED,
        isActive: true,
        isDefault: false,
      });

      // Mark verification as complete
      await this.verifyRepo.update(
        { oauthState: sessionId, contractorId } as any,
        { status: VerificationStatus.VERIFIED, verifiedAt: new Date() },
      );

      await this.auditService.log({
        contractorId, actorType: 'contractor', actorId: contractorId,
        action: 'method.added',
        metadata: { methodId: method.id, methodType: 'BANK_STRIPE', isInstant: true, mode: 'mock' },
      });

      this.logger.warn(`[DEV] Stripe FC finalised in mock mode — method ${method.id}`);
      return method;
    }

    // The session created in initiateBankStripe is the only thing tying this
    // finalise call back to a specific contractor — without checking it here,
    // any authenticated caller could pass an arbitrary linkedAccountId
    // (e.g. replayed from a different session/contractor) and have that bank
    // account silently attached to their own contractorId.
    const verification = await this.verifyRepo.findOne({
      where: { contractorId, oauthState: sessionId, verificationType: 'stripe_fc' } as any,
    });
    if (!verification) {
      throw new PayoutError('This session is invalid or does not belong to you.',
        HttpStatus.FORBIDDEN, 'ERR_STRIPE_FC_SESSION_INVALID');
    }
    if (verification.expiresAt && verification.expiresAt < new Date()) {
      throw new PayoutError('This session has expired. Please start over.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_STRIPE_FC_SESSION_EXPIRED');
    }

    // Production: retrieve FC account from Stripe
    let account: any;
    try {
      account = await this.stripe.financialConnections.accounts.retrieve(linkedAccountId);
    } catch (err: any) {
      this.logger.warn(`Stripe FC account retrieve failed for ${linkedAccountId}: ${err?.message}`);
      throw new PayoutError('We could not find that bank account. Please try connecting again.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_STRIPE_FC_ACCOUNT_NOT_FOUND');
    }

    // Cross-check the account actually belongs to this contractor's own
    // Stripe customer, not just any account ID the caller happened to send.
    const expectedCustomerId = await this.getOrCreateCustomer(contractorId);
    if (account.account_holder?.customer !== expectedCustomerId) {
      this.logger.warn(`Stripe FC account ${linkedAccountId} customer mismatch for contractor ${contractorId}`);
      throw new PayoutError('This bank account does not belong to your session.',
        HttpStatus.FORBIDDEN, 'ERR_STRIPE_FC_ACCOUNT_OWNERSHIP_MISMATCH');
    }

    if (account.status !== 'active') {
      throw new PayoutError('Bank account could not be verified. Please try again.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_STRIPE_FC_ACCOUNT_INACTIVE');
    }

    // Same duplicate check methods.service.ts already does for manually-
    // entered banks (by accountNumberHash) — without this, re-running the FC
    // flow on an already-linked account (e.g. double-click, browser back/
    // retry) silently creates a second active row for the identical bank
    // account instead of rejecting.
    const existingMethod = await this.methodRepo.findOne({
      where: { contractorId, stripeAccountId: account.id, isActive: true },
    });
    if (existingMethod) {
      throw new PayoutError('This account is already linked.',
        HttpStatus.CONFLICT, 'ERR_DEPOSIT_METHOD_DUPLICATE');
    }

    const isInstant = account.subcategory !== 'manually_entered';

    const method = await this.methodRepo.save({
      contractorId,
      methodType: MethodType.BANK_STRIPE,
      stripeAccountId: account.id,
      bankAccountName: account.display_name ?? account.institution_name,
      bankAccountLast4: account.last4,
      bankCountry: 'US',
      bankCurrency: 'USD',
      displayLabel: `${account.institution_name} ••••${account.last4}`,
      verificationStatus: isInstant ? VerificationStatus.VERIFIED : VerificationStatus.PENDING,
      isActive: true,
      isDefault: false,
    });

    if (!isInstant) {
      await this.initiateStripeMicroDeposits(method, account);
    }

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: 'method.added',
      metadata: { methodId: method.id, methodType: 'BANK_STRIPE', isInstant },
    });

    return method;
  }

  // ─── Micro-deposit initiation ─────────────────────────────────
  private async initiateStripeMicroDeposits(method: DepositMethod, account: any) {
    const customerId = await this.getOrCreateCustomer(method.contractorId);

    const setupIntent = await this.stripe.setupIntents.create({
      payment_method_types: ['us_bank_account'],
      customer: customerId,
      payment_method_data: {
        type: 'us_bank_account',
        us_bank_account: { financial_connections_account: account.id },
      },
      mandate_data: {
        customer_acceptance: {
          type: 'online',
          online: { ip_address: '0.0.0.0', user_agent: 'payout-service' },
        },
      },
    });

    await this.stripe.setupIntents.verifyMicrodeposits(setupIntent.id, {
      descriptor_code: 'MRKTEQ',
    });

    await this.verifyRepo.save({
      depositMethodId: method.id,
      contractorId: method.contractorId,
      verificationType: 'micro_deposit',
      oauthState: setupIntent.id,
      maxAttempts: 3,
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: VerificationStatus.PENDING,
    } as any);
  }

  // ─── Micro-deposit confirmation ───────────────────────────────
  async confirmMicroDeposits(contractorId: string, methodId: string, amount1: number, amount2: number) {
    const verification = await this.verifyRepo.findOne({
      where: { depositMethodId: methodId, contractorId, status: VerificationStatus.PENDING } as any,
    });

    if (!verification) throw new PayoutError('No pending verification found.',
      HttpStatus.NOT_FOUND, 'ERR_VERIFICATION_NOT_FOUND');

    if (verification.lockedUntil && verification.lockedUntil > new Date()) {
      throw new PayoutError('Too many failed attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS, 'ERR_VERIFICATION_LOCKED');
    }

    if (verification.expiresAt! < new Date()) {
      throw new PayoutError('Verification window has expired. Please re-link your bank.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_VERIFICATION_EXPIRED');
    }

    if (!this.stripe || !this.isRealStripeKey()) {
      // Dev mode — check against stored amounts
      if (verification.amount1Cents === amount1 && verification.amount2Cents === amount2) {
        await this.methodRepo.update(methodId, { verificationStatus: VerificationStatus.VERIFIED });
        await this.verifyRepo.update(verification.id, { status: VerificationStatus.VERIFIED as any, verifiedAt: new Date() });
        return { verified: true };
      }
      // Fall through to failure handling below
    } else {
      try {
        await this.stripe.setupIntents.verifyMicrodeposits(verification.oauthState, {
          amounts: [amount1, amount2],
        });
        await this.methodRepo.update(methodId, { verificationStatus: VerificationStatus.VERIFIED });
        await this.verifyRepo.update(verification.id, { status: VerificationStatus.VERIFIED as any, verifiedAt: new Date() });
        return { verified: true };
      } catch {
        // Fall through to failure handling
      }
    }

    // Failed attempt
    verification.attemptCount = (verification.attemptCount ?? 0) + 1;

    if (verification.attemptCount >= (verification.maxAttempts ?? 3)) {
      await this.verifyRepo.update(verification.id, {
        attemptCount: verification.attemptCount,
        lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: VerificationStatus.LOCKED as any,
      });
      await this.methodRepo.update(methodId, { verificationStatus: VerificationStatus.LOCKED });
      throw new PayoutError('Too many failed attempts. Try again in 24 hours.',
        HttpStatus.TOO_MANY_REQUESTS, 'ERR_VERIFICATION_LOCKED');
    }

    await this.verifyRepo.update(verification.id, { attemptCount: verification.attemptCount });
    const remaining = (verification.maxAttempts ?? 3) - verification.attemptCount;
    throw new PayoutError(`Incorrect amounts. ${remaining} attempt(s) remaining.`,
      HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_VERIFICATION_AMOUNTS_INCORRECT');
  }

  // ─── Webhook event construction ───────────────────────────────
  constructWebhookEvent(rawBody: Buffer, signature: string): any {
    if (!this.stripe) throw new PayoutError('Stripe not configured.', HttpStatus.SERVICE_UNAVAILABLE, 'ERR_STRIPE_NOT_CONFIGURED');
    return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
  }

  // ─── Webhook handlers ─────────────────────────────────────────
  async handleFCDisconnected(account: any) {
    const method = await this.methodRepo.findOne({
      where: { stripeAccountId: account.id, isActive: true },
    });
    if (!method) return;
    await this.methodRepo.update(method.id, { verificationStatus: VerificationStatus.FAILED });
    this.logger.warn(`FC disconnected: method ${method.id} marked failed`);
  }

  async handlePayoutPaid(stripePayout: any) {
    this.logger.log(`Stripe payout.paid: ${stripePayout.id}`);
    // Full implementation in PS-20 when publisher is connected
  }

  async handlePayoutFailed(stripePayout: any) {
    this.logger.log(`Stripe payout.failed: ${stripePayout.id}`);
    // Full implementation in PS-20
  }

  // ─── Session restart ──────────────────────────────────────────
  async restartStripeFC(contractorId: string, oldMethodId?: string) {
    if (oldMethodId) {
      await this.methodRepo.update(
        { id: oldMethodId, contractorId } as any,
        { isActive: false, deactivatedAt: new Date() },
      );
    }
    return this.initiateBankStripe(contractorId);
  }

  // ─── Helpers ──────────────────────────────────────────────────
  // No stripeCustomerId column exists on any payout-service entity, so
  // instead of adding a migration for a single cached field, this looks
  // the customer up by the contractorId tag we set at creation time
  // (Stripe's Search API, not a local join) — idempotent across calls
  // without new schema.
  private async getOrCreateCustomer(contractorId: string): Promise<string> {
    if (!this.stripe || !this.isRealStripeKey()) {
      return `cus_mock_${contractorId.slice(0, 8)}`;
    }

    const existing = await this.stripe.customers.search({
      query: `metadata['contractorId']:'${contractorId}'`,
    });
    if (existing.data.length > 0) return existing.data[0].id;

    const customer = await this.stripe.customers.create({
      metadata: { contractorId },
    });
    return customer.id;
  }
}

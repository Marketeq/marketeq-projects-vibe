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

  // ─── Micro-deposit initiation (shared: FC-linked and raw account/routing) ──
  private async createMicrodepositSetupIntent(
    method: DepositMethod,
    usBankAccount: Record<string, any>,
    accountHolderName?: string,
  ): Promise<void> {
    const customerId = await this.getOrCreateCustomer(method.contractorId);

    let setupIntent: any;
    try {
      setupIntent = await this.stripe.setupIntents.create({
        payment_method_types: ['us_bank_account'],
        customer: customerId,
        payment_method_data: {
          type: 'us_bank_account',
          ...(accountHolderName ? { billing_details: { name: accountHolderName } } : {}),
          us_bank_account: usBankAccount,
        },
        payment_method_options: {
          us_bank_account: { verification_method: 'microdeposits' },
        },
        // mandate_data is only accepted alongside confirm:true — this call
        // both attaches the payment method and confirms in one step, which is
        // what actually makes Stripe queue and send the two real ACH credits.
        // verify_microdeposits (POST .../verify_microdeposits) is a *separate*
        // API, only for the later step where the contractor submits the
        // amounts/descriptor they received — calling it here with a made-up
        // code, before Stripe has told anyone a real code, doesn't trigger
        // anything and just burns one of the account's 10 verification
        // attempts against a guaranteed mismatch.
        confirm: true,
        mandate_data: {
          customer_acceptance: {
            type: 'online',
            online: { ip_address: '0.0.0.0', user_agent: 'payout-service' },
          },
        },
      });
    } catch (err: any) {
      // Stripe rejects plenty of legitimately-bad input at this call (invalid
      // routing number, closed/invalid test account number, unsupported bank,
      // etc.) — left unhandled this was surfacing as a raw 500 with Stripe's
      // internal error text leaked straight to the client.
      this.logger.warn(`Stripe ACH SetupIntent creation failed for method ${method.id}: ${err?.message}`);
      throw new PayoutError(
        'We could not set up micro-deposit verification for this bank account. Please double-check the account and routing numbers.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_STRIPE_ACH_SETUP_FAILED');
    }

    await this.verifyRepo.save({
      depositMethodId: method.id,
      contractorId: method.contractorId,
      verificationType: 'micro_deposit',
      oauthState: setupIntent.id,
      // amount1Cents/amount2Cents stay null — Stripe holds the real amounts
      // and verifies them itself via verifyMicrodepositAmounts() below.
      maxAttempts: 3,
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: VerificationStatus.PENDING,
    } as any);
  }

  private async initiateStripeMicroDeposits(method: DepositMethod, account: any) {
    await this.createMicrodepositSetupIntent(method, { financial_connections_account: account.id });
  }

  // ─── PS-08: BANK_MANUAL/US real ACH micro-deposits ────────────
  // Stripe's us_bank_account payment method type only exists for US
  // accounts — there is no equivalent ACH micro-deposit mechanism for any
  // other BANK_MANUAL region, so callers must gate on bankCountry === 'US'
  // and fall back to the existing format-validation-only flow otherwise.
  async initiateManualMicroDeposits(
    method: DepositMethod, accountNumber: string, routingNumber: string, accountHolderName: string,
  ): Promise<{ mode: 'stripe' | 'mock' }> {
    if (!this.stripe || !this.isRealStripeKey()) {
      const amount1 = Math.floor(Math.random() * 99) + 1;
      let amount2: number;
      do { amount2 = Math.floor(Math.random() * 99) + 1; } while (amount2 === amount1);

      await this.verifyRepo.save({
        depositMethodId: method.id,
        contractorId: method.contractorId,
        verificationType: 'micro_deposit',
        amount1Cents: amount1, amount2Cents: amount2,
        maxAttempts: 3,
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: VerificationStatus.PENDING,
      } as any);

      this.logger.warn(`[DEV] Micro-deposits mocked for method ${method.id} — no real Stripe call`);
      return { mode: 'mock' };
    }

    await this.createMicrodepositSetupIntent(method, {
      account_number: accountNumber,
      routing_number: routingNumber,
      account_holder_type: 'individual',
    }, accountHolderName);

    return { mode: 'stripe' };
  }

  // ─── Micro-deposit confirmation (real Stripe path only) ───────
  // Called from MicroDepositService.confirmStripe() for any verification
  // whose oauthState is a real Stripe SetupIntent id (BANK_STRIPE non-instant
  // or BANK_MANUAL/US) — throws on mismatch/failure, letting the caller's
  // existing attempt-count/lockout logic handle it uniformly.
  async verifyMicrodepositAmounts(setupIntentId: string, amount1: number, amount2: number): Promise<void> {
    if (!this.stripe || !this.isRealStripeKey()) {
      throw new PayoutError('Stripe not configured.', HttpStatus.SERVICE_UNAVAILABLE, 'ERR_STRIPE_NOT_CONFIGURED');
    }
    await this.stripe.setupIntents.verifyMicrodeposits(setupIntentId, { amounts: [amount1, amount2] });
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

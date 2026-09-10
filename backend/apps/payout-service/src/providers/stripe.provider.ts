import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService }       from '@nestjs/config';
import { DepositMethod, MethodType, VerificationStatus } from '../entities/deposit-method.entity';
import { DepositMethodVerification } from '../entities/deposit-method-verification.entity';
import { PayoutRequest, PayoutStatus } from '../entities/payout-request.entity';
import { AuditService }        from '../audit/audit.service';
import { PayoutError }         from '../common/errors/payout.error';
import { PayoutPublisher }     from '../publishers/payout.publisher';

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
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
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
      // PS-33 §9/§10: pin to a specific API version deliberately (via env,
      // not left to drift to Stripe's account default) so an upgrade is a
      // conscious, tested change rather than a silent behavior shift.
      this.stripe = new Stripe(this.secretKey, {
        apiVersion: this.config.get('STRIPE_API_VERSION', '2024-06-20'),
        typescript: true,
      });
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

    // Production: create a payout-scoped SetupIntent instead of a standalone
    // Financial Connections session. A standalone FC session only grants
    // read access (balances/payment_method data) — it never produces
    // anything attachable as a Connect external_account. flow_directions:
    // ['outbound'] is what tells Stripe this bank link is for *paying out*
    // to the account, which is required before the resulting payment method
    // can later be tokenized and attached to a connected account (see
    // attachVerifiedBankAsExternalAccount). The frontend calls
    // stripe.collectBankAccountForSetup() + confirmUsBankAccountSetup()
    // against this SetupIntent's client_secret (replacing the old
    // collectFinancialConnectionsAccounts() call), not a native webview, so
    // return_url is omitted — same reasoning as before, just no longer
    // applicable to a session object.
    const setupIntent = await this.stripe.setupIntents.create({
      customer: await this.getOrCreateCustomer(contractorId),
      flow_directions: ['outbound'],
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: { permissions: ['payment_method', 'balances'] },
        },
      },
    });

    await this.verifyRepo.save({
      contractorId,
      verificationType: 'stripe_fc',
      oauthState: setupIntent.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      status: VerificationStatus.PENDING,
    } as any);

    return {
      clientSecret: setupIntent.client_secret,
      sessionId: setupIntent.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  // ─── Step 3: Finalise account link ────────────────────────────
  // linkedAccountId is no longer accepted from the caller — under the old
  // standalone-FC-session flow the client supplied it directly, but that
  // meant trusting a client-controlled Stripe ID. It's now derived
  // server-side from the verified SetupIntent (see setupIntent.payment_method
  // below), which is strictly stronger than the ownership check this
  // replaced.
  async finaliseBankStripe(contractorId: string, sessionId: string) {
    if (!this.stripe || !this.isRealStripeKey()) {
      // Dev mode — create method directly as verified, with mock Connect fields
      const method = await this.methodRepo.save({
        contractorId,
        methodType: MethodType.BANK_STRIPE,
        stripeAccountId: `mock_fca_${Date.now()}`,
        stripeExternalAccountId: `mock_ba_${Date.now()}`,
        stripeConnectAccountId: `mock_acct_${Date.now()}`,
        connectPayoutsEnabled: true,
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
    // any authenticated caller could pass an arbitrary sessionId (e.g.
    // replayed from a different session/contractor) and have that bank
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

    let setupIntent: any;
    try {
      setupIntent = await this.stripe.setupIntents.retrieve(sessionId, { expand: ['payment_method'] });
    } catch (err: any) {
      this.logger.warn(`Stripe SetupIntent retrieve failed for ${sessionId}: ${err?.message}`);
      throw new PayoutError('We could not find that bank account. Please try connecting again.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_STRIPE_FC_ACCOUNT_NOT_FOUND');
    }

    // Ownership is already proven above — this contractorId+sessionId pair only
    // matches a verification row that initiateBankStripe itself created for this
    // exact contractor, so setupIntent.customer is trustworthy as-is. A second
    // "expected customer" re-derived here via getOrCreateCustomer()'s
    // customers.search() was removed: Stripe's Search API lags real-time writes
    // by up to ~1 minute, so calling it again seconds after initiateBankStripe
    // created the customer routinely missed it, created a second duplicate
    // customer, and rejected a legitimate finalise with a false
    // ERR_STRIPE_FC_ACCOUNT_OWNERSHIP_MISMATCH.
    const paymentMethod = setupIntent.payment_method;
    const usBank = paymentMethod?.us_bank_account;
    if (!usBank) {
      throw new PayoutError('Bank account could not be verified. Please try again.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_STRIPE_FC_ACCOUNT_INACTIVE');
    }
    const fcAccountId: string | null = usBank.financial_connections_account ?? null;

    // Same duplicate check methods.service.ts already does for manually-
    // entered banks (by accountNumberHash) — without this, re-running the FC
    // flow on an already-linked account (e.g. double-click, browser back/
    // retry) silently creates a second active row for the identical bank
    // account instead of rejecting.
    if (fcAccountId) {
      const existingMethod = await this.methodRepo.findOne({
        where: { contractorId, stripeAccountId: fcAccountId, isActive: true },
      });
      if (existingMethod) {
        throw new PayoutError('This account is already linked.',
          HttpStatus.CONFLICT, 'ERR_DEPOSIT_METHOD_DUPLICATE');
      }
    }

    if (setupIntent.status !== 'succeeded') {
      // Bank didn't instantly verify via OAuth login — Stripe has queued
      // real micro-deposits against the SetupIntent itself (verification_method:
      // 'microdeposits' isn't set here explicitly, but Stripe falls back to it
      // automatically for FC-linked accounts that can't be instantly verified).
      // The payment method isn't usable as an external_account yet, so save the
      // method as PENDING and re-type the verification row to 'micro_deposit' —
      // verifyMicrodepositAmounts() finishes the Connect attach once the
      // contractor confirms the amounts.
      const method = await this.methodRepo.save({
        contractorId,
        methodType: MethodType.BANK_STRIPE,
        stripeAccountId: fcAccountId,
        bankAccountName: usBank.bank_name,
        bankAccountLast4: usBank.last4,
        bankCountry: 'US',
        bankCurrency: 'USD',
        displayLabel: `${usBank.bank_name ?? 'Bank'} ••••${usBank.last4 ?? ''} (pending verification)`,
        verificationStatus: VerificationStatus.PENDING,
        isActive: true,
        isDefault: false,
      });

      await this.verifyRepo.update(
        { oauthState: sessionId, contractorId } as any,
        {
          depositMethodId: method.id,
          verificationType: 'micro_deposit',
          maxAttempts: 3,
          expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        },
      );

      await this.auditService.log({
        contractorId, actorType: 'contractor', actorId: contractorId,
        action: 'method.added',
        metadata: { methodId: method.id, methodType: 'BANK_STRIPE', isInstant: false },
      });

      return method;
    }

    const attached = await this.attachVerifiedBankAsExternalAccount(contractorId, sessionId, setupIntent);

    const method = await this.methodRepo.save({
      contractorId,
      methodType: MethodType.BANK_STRIPE,
      stripeAccountId: fcAccountId,
      stripeExternalAccountId: attached.externalAccountId,
      stripeConnectAccountId: attached.connectAccountId,
      connectPayoutsEnabled: attached.connectPayoutsEnabled,
      connectRequirementsDue: attached.connectRequirementsDue,
      bankAccountName: usBank.bank_name,
      bankAccountLast4: usBank.last4,
      bankCountry: 'US',
      bankCurrency: 'USD',
      displayLabel: `${usBank.bank_name ?? 'Bank'} ••••${usBank.last4 ?? ''}`,
      verificationStatus: VerificationStatus.VERIFIED,
      isActive: true,
      isDefault: false,
    });

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: 'method.added',
      metadata: { methodId: method.id, methodType: 'BANK_STRIPE', isInstant: true },
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
        // Required for the resulting payment method to later be tokenized
        // and attached as a Connect external_account — same reasoning as
        // initiateBankStripe's SetupIntent.
        flow_directions: ['outbound'],
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

  // ─── Connect: attach a verified bank as an external_account ────
  // Shared by finaliseBankStripe's instant path and verifyMicrodepositAmounts'
  // post-confirmation path — both end up with a confirmed SetupIntent whose
  // payment_method is a usable us_bank_account, regardless of whether the
  // bank was linked via Financial Connections or entered manually
  // (BANK_MANUAL/US). Implements the direct-API flow from
  // docs.stripe.com/connect/payouts-bank-accounts (FC path): SetupIntent →
  // token from the confirmed payment method → external_account on the
  // connected account.
  private async attachVerifiedBankAsExternalAccount(
    contractorId: string, setupIntentId: string, confirmedSetupIntent?: any,
  ): Promise<{
    connectAccountId: string;
    externalAccountId: string;
    connectPayoutsEnabled: boolean;
    connectRequirementsDue: string[] | null;
  }> {
    const setupIntent = confirmedSetupIntent
      ?? await this.stripe.setupIntents.retrieve(setupIntentId, { expand: ['payment_method'] });
    const paymentMethod = setupIntent.payment_method;
    if (!paymentMethod?.us_bank_account) {
      throw new PayoutError('Bank account could not be verified for payouts.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_STRIPE_ACH_VERIFICATION_INCOMPLETE');
    }

    const connect = await this.getOrCreateConnectAccount(contractorId);
    const connectAccountId = connect.accountId;

    // customer belongs in params (alongside bank_account), not options —
    // options is Stripe request config (stripeAccount/idempotencyKey/etc).
    // The token must be created *as* the connected account (stripeAccount)
    // so it's eligible to be attached as that account's external_account;
    // creating it on the platform account produces a token
    // createExternalAccount then rejects as belonging to the wrong account.
    let token: any;
    try {
      token = await this.stripe.tokens.create(
        { bank_account: { payment_method: paymentMethod.id }, customer: setupIntent.customer },
        { stripeAccount: connectAccountId },
      );
    } catch (err: any) {
      this.logger.warn(`Stripe bank_account token creation failed for ${paymentMethod.id}: ${err?.message}`);
      throw new PayoutError('We could not attach your bank account for payouts. Please try again.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_STRIPE_CONNECT_TOKEN_FAILED');
    }

    let externalAccount: any;
    try {
      // PS-33 §6: idempotency key pattern is extaccount-{depositMethodId},
      // but no deposit_methods row exists yet on the instant-verify path
      // (finaliseBankStripe creates it right after this call). setupIntentId
      // is unique per verification attempt and known at every call site, so
      // it serves the same dedup purpose — a retried callback for the same
      // SetupIntent must not attach a second external_account.
      externalAccount = await this.stripe.accounts.createExternalAccount(
        connectAccountId,
        { external_account: token.id },
        { idempotencyKey: `extaccount-${setupIntentId}` },
      );
    } catch (err: any) {
      this.logger.warn(`Stripe external_account attach failed for account ${connectAccountId}: ${err?.message}`);
      throw new PayoutError('We could not attach your bank account for payouts. Please contact support.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_STRIPE_CONNECT_EXTERNAL_ACCOUNT_FAILED');
    }

    return {
      connectAccountId,
      externalAccountId: externalAccount.id,
      connectPayoutsEnabled: connect.payoutsEnabled,
      connectRequirementsDue: connect.requirementsDue,
    };
  }

  // One Connect custom account per contractor — deposit methods are
  // per-method, but a contractor should only ever have one connected
  // account regardless of how many bank methods they add. Looked up
  // locally (methodRepo) rather than via a Stripe-side search — the
  // Accounts API has no metadata-search endpoint the way Customers does.
  private async getOrCreateConnectAccount(contractorId: string): Promise<{
    accountId: string;
    payoutsEnabled: boolean;
    requirementsDue: string[] | null;
  }> {
    if (!this.stripe || !this.isRealStripeKey()) {
      return { accountId: `acct_mock_${contractorId.slice(0, 8)}`, payoutsEnabled: true, requirementsDue: null };
    }

    // Real Stripe Connect account IDs are always `acct_...`, never
    // `acct_mock...`/`mock_acct_...`. A row can carry one of those
    // placeholders if it was created by the dev-mode branch above (this.stripe
    // unset/fake at the time — a stale key mid-restart, for instance).
    // Filtering at the query level (not just checking the single most-recent
    // row) means an older row's real account ID still gets found and reused
    // — the actual intent of this method, one Connect account per contractor
    // — instead of silently minting a second real Connect account once a
    // mock row happens to be the newest.
    const existing = await this.methodRepo
      .createQueryBuilder('m')
      .where('m.contractor_id = :contractorId', { contractorId })
      .andWhere("m.stripe_connect_account_id LIKE 'acct\\_%' ESCAPE '\\'")
      .andWhere("m.stripe_connect_account_id NOT LIKE 'acct\\_mock%' ESCAPE '\\'")
      .orderBy('m.created_at', 'DESC')
      .getOne();
    if (existing?.stripeConnectAccountId) {
      // Re-fetch the account's live state instead of trusting whatever the
      // last row we found happened to record. handleAccountUpdated only
      // backfills deposit_methods rows that already exist at the moment its
      // webhook fires (`methodRepo.update({ stripeConnectAccountId }, ...)`)
      // — a brand-new row created here for an already-approved account (e.g.
      // a contractor adding a second bank) would otherwise silently default
      // to connectPayoutsEnabled: false forever, since Stripe never re-sends
      // account.updated once payouts_enabled has already flipped true.
      const account = await this.stripe.accounts.retrieve(existing.stripeConnectAccountId);
      return {
        accountId: existing.stripeConnectAccountId,
        payoutsEnabled: !!account.payouts_enabled,
        requirementsDue: account.requirements?.currently_due ?? null,
      };
    }

    const account = await this.stripe.accounts.create({
      type: 'custom',
      country: 'US',
      business_type: 'individual',
      // Recipient-only — contractors never take charges on this account, so
      // no card_payments/merchant capability is requested.
      capabilities: { transfers: { requested: true } },
      metadata: { contractorId },
    });
    return {
      accountId: account.id,
      payoutsEnabled: !!account.payouts_enabled,
      requirementsDue: account.requirements?.currently_due ?? null,
    };
  }

  // ─── PS-09 v2.0 §8: Connect external_account from a raw routing +
  // account number ──────────────────────────────────────────────
  // Used by OAuthService.handleCallback() after retrieving a contractor's
  // Wise/Payoneer US routing + account number via fetchBankingDetails() —
  // this is the step that lets Stripe ACH funds directly to the
  // contractor's Wise or Payoneer balance without Marketeq ever calling the
  // Wise/Payoneer Payouts API. Unlike attachVerifiedBankAsExternalAccount
  // (BANK_STRIPE/BANK_MANUAL, which goes through a confirmed SetupIntent +
  // token), Wise/Payoneer never hand payout-service a SetupIntent — the
  // routing/account number is all the provider API returns — so the
  // external_account is created directly from those raw values, per
  // PS-09 §8's documented createExternalAccount() shape.
  async createExternalAccountFromRouting(params: {
    contractorId: string;
    depositMethodId: string;
    routingNumber: string;
    accountNumber: string;
    accountHolderName: string;
  }): Promise<{
    connectAccountId: string;
    externalAccountId: string;
    connectPayoutsEnabled: boolean;
    connectRequirementsDue: string[] | null;
  }> {
    const connect = await this.getOrCreateConnectAccount(params.contractorId);
    const connectAccountId = connect.accountId;

    if (!this.stripe || !this.isRealStripeKey()) {
      return {
        connectAccountId, externalAccountId: `ba_mock_${Date.now()}`,
        connectPayoutsEnabled: connect.payoutsEnabled, connectRequirementsDue: connect.requirementsDue,
      };
    }

    let externalAccount: any;
    try {
      // PS-33 §6: extaccount-{depositMethodId} — prevents a network-error
      // retry of this same OAuth callback from attaching a second
      // external_account for the same deposit method.
      externalAccount = await this.stripe.accounts.createExternalAccount(
        connectAccountId,
        {
          external_account: {
            object: 'bank_account',
            country: 'US',
            currency: 'usd',
            routing_number: params.routingNumber,
            account_number: params.accountNumber,
            account_holder_name: params.accountHolderName,
            account_holder_type: 'individual',
          },
        },
        { idempotencyKey: `extaccount-${params.depositMethodId}` },
      );
    } catch (err: any) {
      this.logger.warn(`Stripe external_account attach failed (routing) for account ${connectAccountId}: ${err?.message}`);
      throw new PayoutError('We could not attach your account for payouts. Please contact support.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_STRIPE_CONNECT_EXTERNAL_ACCOUNT_FAILED');
    }

    return {
      connectAccountId, externalAccountId: externalAccount.id,
      connectPayoutsEnabled: connect.payoutsEnabled, connectRequirementsDue: connect.requirementsDue,
    };
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
  async verifyMicrodepositAmounts(
    setupIntentId: string, amount1: number, amount2: number, depositMethodId: string,
  ): Promise<void> {
    if (!this.stripe || !this.isRealStripeKey()) {
      throw new PayoutError('Stripe not configured.', HttpStatus.SERVICE_UNAVAILABLE, 'ERR_STRIPE_NOT_CONFIGURED');
    }
    // Stripe's test-mode sandbox can resolve a SetupIntent straight to
    // "succeeded" before the contractor ever submits amounts (observed with
    // the documented test account 000123456789). verifyMicrodeposits() only
    // accepts intents still in requires_action, so calling it on an
    // already-succeeded intent throws — and that error would otherwise be
    // indistinguishable from a genuine wrong-amounts submission below.
    //
    // This skip must NEVER apply with a live key: existing.livemode is false
    // only for test-mode keys, so a production SetupIntent that is somehow
    // already "succeeded" here still goes through verifyMicrodeposits() (and
    // fails loudly) rather than being waved through on unchecked amounts.
    const existing = await this.stripe.setupIntents.retrieve(setupIntentId);
    if (existing.status === 'succeeded' && !existing.livemode) {
      this.logger.warn(
        `verifyMicrodepositAmounts: SetupIntent ${setupIntentId} was already ` +
        'succeeded in test mode — skipping verifyMicrodeposits() without checking ' +
        'the submitted amounts (Stripe sandbox-only behavior, see comment above).',
      );
    } else {
      await this.stripe.setupIntents.verifyMicrodeposits(setupIntentId, { amounts: [amount1, amount2] });
    }

    // Amounts confirmed — the SetupIntent's payment_method is now a usable
    // us_bank_account. Finish what finaliseBankStripe's non-instant branch
    // (or initiateManualMicroDeposits, for BANK_MANUAL/US) deferred: attach
    // it as a Connect external_account so the method is actually payable.
    // Must throw (not silently return) on a miss here — confirmStripe() only
    // calls applySuccess() (verificationStatus: VERIFIED) when this function
    // doesn't throw, so returning normally without attaching would mark the
    // method verified while stripeConnectAccountId/stripeExternalAccountId
    // stay null forever, permanently failing every payout against it with
    // ERR_CONNECT_ACCOUNT_NOT_ATTACHED.
    const method = await this.methodRepo.findOne({ where: { id: depositMethodId } });
    if (!method) {
      throw new PayoutError('Deposit method not found. Please try connecting your bank account again.',
        HttpStatus.NOT_FOUND, 'ERR_DEPOSIT_METHOD_NOT_FOUND');
    }

    const attached = await this.attachVerifiedBankAsExternalAccount(method.contractorId, setupIntentId);
    await this.methodRepo.update(method.id, {
      stripeExternalAccountId: attached.externalAccountId,
      stripeConnectAccountId: attached.connectAccountId,
      connectPayoutsEnabled: attached.connectPayoutsEnabled,
      connectRequirementsDue: attached.connectRequirementsDue,
    });
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

  // Connect-account payout settlement, matched by the id bank-payout-executor
  // stored as externalTransactionId when it created the Stripe payout. Note:
  // Stripe delivers connected-account payout events to the platform's
  // webhook endpoint only if that endpoint is configured (in the Stripe
  // Dashboard) to also receive Connect events — this is an operational
  // setup step, not something the code can enforce.
  async handlePayoutPaid(stripePayout: any) {
    this.logger.log(`Stripe payout.paid: ${stripePayout.id}`);
    const payout = await this.payoutRepo.findOne({ where: { externalTransactionId: stripePayout.id } });
    if (!payout) {
      this.logger.warn(`payout.paid for unknown externalTransactionId ${stripePayout.id}`);
      return;
    }

    await this.payoutRepo.update(payout.id, {
      status: PayoutStatus.COMPLETED,
      completedAt: new Date(),
      settledAt: new Date(),
      providerStatus: 'settled',
    });

    await this.auditService.log({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      actorType: 'service',
      actorId: 'stripe-webhook',
      action: 'bank.payout.settled',
      previousStatus: PayoutStatus.PROCESSING,
      newStatus: PayoutStatus.COMPLETED,
      metadata: { stripePayoutId: stripePayout.id },
    });

    await this.publisher.publishPayoutCompleted({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      amount: payout.amountUsd,
      currency: 'USD',
      methodType: 'BANK',
      settledAt: new Date().toISOString(),
    });
  }

  async handlePayoutFailed(stripePayout: any) {
    this.logger.log(`Stripe payout.failed: ${stripePayout.id}`);
    const payout = await this.payoutRepo.findOne({ where: { externalTransactionId: stripePayout.id } });
    if (!payout) {
      this.logger.warn(`payout.failed for unknown externalTransactionId ${stripePayout.id}`);
      return;
    }

    const reason = stripePayout.failure_message ?? 'Bank payout failed.';
    await this.payoutRepo.update(payout.id, {
      status: PayoutStatus.FAILED,
      failedAt: new Date(),
      failureReason: reason,
    });

    await this.auditService.log({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      actorType: 'service',
      actorId: 'stripe-webhook',
      action: 'bank.payout.failed',
      previousStatus: PayoutStatus.PROCESSING,
      newStatus: PayoutStatus.FAILED,
      metadata: { stripePayoutId: stripePayout.id, failureCode: stripePayout.failure_code },
    });

    await this.publisher.publishPayoutFailed({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      amount: payout.amountUsd,
      currency: 'USD',
      methodType: 'BANK',
      reason,
      failedAt: new Date().toISOString(),
    });

    // By the time Stripe sends payout.failed, the platform→connected-account
    // Transfer had already succeeded (that's what funded the Payout in the
    // first place — see bank-payout-executor.service.ts) — so that money is
    // now stranded in the contractor's connected account balance rather
    // than back on the platform's own Stripe balance. Reverse it so the
    // real Stripe balance matches what payout_requests/balance_snapshots
    // already record as failed.
    const transferId = (payout.providerResponse as any)?.transferId;
    if (transferId && typeof transferId === 'string' && !transferId.startsWith('tr_stub')) {
      try {
        await this.stripe.transfers.createReversal(transferId, { idempotencyKey: `reversal-${payout.id}` });
        this.logger.log(`Reversed transfer ${transferId} for failed payout ${payout.id}`);
      } catch (err: any) {
        // Must not block the rest of this handler — the DB-side reversal
        // (publishPayoutFailed above) and method deactivation below still
        // have to happen. Logged loudly since this leaves real platform
        // funds stranded in the connected account until reversed manually.
        this.logger.error(
          `Failed to reverse transfer ${transferId} for payout ${payout.id} — funds remain stranded in the connected account: ${err.message}`,
        );
        await this.auditService.log({
          contractorId: payout.contractorId, payoutRequestId: payout.id,
          actorType: 'service', actorId: 'stripe-webhook',
          action: 'bank.transfer.reversal_failed',
          metadata: { transferId, error: err.message },
        });
      }
    }

    // PS-33 §8: certain failure codes mean the destination itself is bad
    // (closed account, wrong routing+account combo, ACH debits blocked) —
    // retrying the same destination will only fail again, so deactivate the
    // method and make the contractor add a new one rather than silently
    // re-attempting on the next payout cycle.
    const deactivateOn = ['account_closed', 'no_account', 'debit_not_authorized'];
    if (payout.depositMethodId && deactivateOn.includes(stripePayout.failure_code)) {
      await this.methodRepo.update(payout.depositMethodId, {
        isActive: false, deactivatedAt: new Date(),
      } as any);
      await this.auditService.log({
        contractorId: payout.contractorId,
        actorType: 'service', actorId: 'stripe-webhook',
        action: 'method.deactivated',
        metadata: { depositMethodId: payout.depositMethodId, reason: stripePayout.failure_code },
      });
    }
  }

  // PS-33 §5: logged for visibility only — status is already set to
  // PROCESSING when payout-service calls stripe.payouts.create(), so this
  // webhook (fired immediately after that call succeeds) is a confirmation,
  // not a state transition.
  async handlePayoutCreated(stripePayout: any) {
    this.logger.log(`Stripe payout.created: ${stripePayout.id}`);
  }

  // PS-33 §5: metadata/status changes on an in-flight Payout. The only
  // status this needs to react to is one payout.paid/payout.failed doesn't
  // already cover — Stripe fires those dedicated events for the terminal
  // transitions, so this stays log-only per the doc ("Log. Check if status
  // changed and update payout_requests accordingly").
  async handlePayoutUpdated(stripePayout: any) {
    this.logger.log(`Stripe payout.updated: ${stripePayout.id} status=${stripePayout.status}`);
  }

  // PS-33 §5: a Payout cancelled before it settles — only possible while
  // still in transit. Reverses the earnings debit the same way a failed
  // payout does (publishPayoutFailed's consumer restores available_balance).
  async handlePayoutCanceled(stripePayout: any) {
    this.logger.log(`Stripe payout.canceled: ${stripePayout.id}`);
    const payout = await this.payoutRepo.findOne({ where: { externalTransactionId: stripePayout.id } });
    if (!payout) {
      this.logger.warn(`payout.canceled for unknown externalTransactionId ${stripePayout.id}`);
      return;
    }

    await this.payoutRepo.update(payout.id, {
      status: PayoutStatus.CANCELLED,
    });

    await this.auditService.log({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      actorType: 'service', actorId: 'stripe-webhook',
      action: 'bank.payout.cancelled',
      previousStatus: PayoutStatus.PROCESSING,
      newStatus: PayoutStatus.CANCELLED,
      metadata: { stripePayoutId: stripePayout.id },
    });

    await this.publisher.publishPayoutFailed({
      contractorId: payout.contractorId,
      payoutRequestId: payout.id,
      amount: payout.amountUsd,
      currency: 'USD',
      methodType: 'BANK',
      reason: 'Payout was cancelled by Stripe before settlement.',
      failedAt: new Date().toISOString(),
    });
  }

  // PS-33 §5: confirmation that the Transfer step (platform → connected
  // account) landed. payout-service already stores transfer.id in
  // providerResponse.transferId at creation time (bank-payout-executor.ts),
  // so this is log-only.
  async handleTransferCreated(transfer: any) {
    this.logger.log(`Stripe transfer.created: ${transfer.id}`);
  }

  // PS-33 §5: a reversed Transfer means funds already sent to a contractor's
  // connected account were clawed back — this always needs a human to look
  // at it (e.g. Stripe detected fraud, or the platform account itself
  // reversed the charge upstream). No automatic status change here; this
  // logs loudly and records an audit entry for finance/ops to review, since
  // there is no dedicated ops-alert channel in this service to page out to.
  async handleTransferReversed(transfer: any) {
    this.logger.error(`Stripe transfer.reversed: ${transfer.id} — manual finance review required`);
    const payout = await this.payoutRepo
      .createQueryBuilder('p')
      .where(`p.provider_response @> :json`, { json: JSON.stringify({ transferId: transfer.id }) })
      .getOne();

    await this.auditService.log({
      contractorId: payout?.contractorId ?? 'unknown',
      payoutRequestId: payout?.id,
      actorType: 'service', actorId: 'stripe-webhook',
      action: 'bank.transfer.reversed',
      metadata: { transferId: transfer.id, payoutRequestId: payout?.id ?? null, requiresManualReview: true },
    });
  }

  // PS-33 §5: an external_account (bank/Wise/Payoneer routing+account) was
  // disabled or updated — typically after a payout failure Stripe decided
  // means the destination is no longer usable. Mark the method as needing
  // re-verification rather than silently letting the next scheduled payout
  // fail against it.
  async handleExternalAccountUpdated(externalAccount: any) {
    if (externalAccount.object !== 'bank_account' || externalAccount.status !== 'errored') return;

    const method = await this.methodRepo.findOne({
      where: { stripeExternalAccountId: externalAccount.id, isActive: true },
    });
    if (!method) return;

    await this.methodRepo.update(method.id, { verificationStatus: VerificationStatus.FAILED } as any);
    await this.auditService.log({
      contractorId: method.contractorId,
      actorType: 'service', actorId: 'stripe-webhook',
      action: 'method.external_account_errored',
      metadata: { depositMethodId: method.id, stripeExternalAccountId: externalAccount.id },
    });
    this.logger.warn(`account.external_account.updated: method ${method.id} marked FAILED (errored external account)`);
  }

  // Connect account lifecycle — keeps connectPayoutsEnabled/connectRequirementsDue
  // in sync so bank-payout-executor's pre-flight check reflects Stripe's own
  // review state instead of assuming "attached = payable".
  // One Stripe Connect account is shared across every bank deposit method a
  // contractor adds (see getOrCreateConnectAccount) — updates here must match
  // by stripeConnectAccountId directly (all rows sharing that account), not
  // findOne()+update-by-id, which only ever touched one arbitrary row and left
  // every other method referencing the same Connect account stuck on a stale
  // connectPayoutsEnabled even after Stripe genuinely approved the account.
  async handleAccountUpdated(account: any) {
    await this.methodRepo.update(
      { stripeConnectAccountId: account.id } as any,
      {
        connectPayoutsEnabled: !!account.payouts_enabled,
        connectRequirementsDue: account.requirements?.currently_due ?? null,
      },
    );
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

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
  ): Promise<{
    instant: boolean;
    externalAccountId?: string;
    connectAccountId?: string;
    connectPayoutsEnabled?: boolean;
    connectRequirementsDue?: string[] | null;
  }> {
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
        // Needed for the instant-success branch below — attachVerifiedBankAsExternalAccount()
        // reads setupIntent.payment_method.us_bank_account directly off the object it's
        // handed (confirmedSetupIntent), rather than re-fetching. Without this expand,
        // create() returns payment_method as a bare string id, so that check always fails
        // with ERR_STRIPE_ACH_VERIFICATION_INCOMPLETE even when Stripe genuinely verified
        // the account instantly.
        expand: ['payment_method'],
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

    // Stripe can resolve a us_bank_account SetupIntent straight to
    // "succeeded" without ever queuing real micro-deposits — every one of
    // Stripe's documented test account numbers behaves this way (their
    // documented pass/fail outcomes only surface later, at an actual
    // payment/payout against the account, never at SetupIntent creation),
    // and Stripe does the same for real accounts it can verify instantly via
    // its own bank-network data. Previously this method always created a
    // PENDING micro-deposit verification row regardless of setupIntent.status
    // — for every one of these accounts there were no real deposits coming
    // and no correct amounts to ever submit, so the deposit method was stuck
    // "pending" forever. Mirrors finaliseBankStripe's existing instant branch.
    //
    // QA/product requirement: against a Stripe *test* key, skip this instant
    // path entirely and fall through to the normal PENDING branch below, so
    // manually-entered accounts — including Stripe's own documented test
    // numbers — always go through the real micro-deposit UI (instructions ->
    // enter amounts -> verified/locked/expired) instead of silently jumping
    // to "verified". This is safe to do unconditionally in test mode:
    // verifyMicrodepositAmounts() already knows how to finish an
    // already-succeeded *test-mode* SetupIntent without calling Stripe's real
    // verifyMicrodeposits() on it (see that method's comment), so whatever
    // amounts the contractor submits later still verifies correctly — this
    // only changes when the UI shows "verified", never whether it eventually
    // does. A live key never takes this branch: real accounts Stripe verifies
    // instantly still skip straight to "verified", matching what an actual
    // customer sees. Toggle with STRIPE_SKIP_INSTANT_VERIFY_IN_TEST=false if a
    // dev/staging environment genuinely needs the old shortcut back.
    const skipInstantInTest =
      this.secretKey.startsWith('sk_test_') &&
      this.config.get('STRIPE_SKIP_INSTANT_VERIFY_IN_TEST', 'true') !== 'false';

    if (setupIntent.status === 'succeeded' && !skipInstantInTest) {
      const attached = await this.attachVerifiedBankAsExternalAccount(method.contractorId, setupIntent.id, setupIntent);
      return {
        instant: true,
        externalAccountId: attached.externalAccountId,
        connectAccountId: attached.connectAccountId,
        connectPayoutsEnabled: attached.connectPayoutsEnabled,
        connectRequirementsDue: attached.connectRequirementsDue,
      };
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
    return { instant: false };
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
    // Tokenizing a payment_method for cross-account transfer immediately
    // after its SetupIntent confirms (confirm: true, same request) can hit an
    // intermittent Stripe-side failure — observed live as a spurious
    // "Invalid bank account currency for US-based bank account: USD" that is
    // NOT reproducible in isolation: retrying the identical
    // paymentMethod/customer/connectAccountId call moments later succeeds,
    // but the exact delay needed isn't consistent (a single 1.5s retry still
    // failed in testing; other attempts succeeded on the very first try).
    // Retry a few times with backoff rather than failing a genuinely-valid
    // bank account on what looks like Stripe test-mode flakiness.
    const retryDelaysMs = [1000, 2000, 4000];
    let token: any;
    let lastErr: any;
    for (let attempt = 1; attempt <= retryDelaysMs.length + 1; attempt++) {
      try {
        token = await this.stripe.tokens.create(
          { bank_account: { payment_method: paymentMethod.id }, customer: setupIntent.customer },
          { stripeAccount: connectAccountId },
        );
        lastErr = null;
        break;
      } catch (err: any) {
        lastErr = err;
        const delay = retryDelaysMs[attempt - 1];
        if (delay !== undefined) {
          this.logger.warn(`Stripe bank_account token creation failed for ${paymentMethod.id} (attempt ${attempt}): ${err?.message} — retrying in ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    if (lastErr) {
      this.logger.warn(`Stripe bank_account token creation failed for ${paymentMethod.id}: ${lastErr?.message}`);
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
  private async getOrCreateConnectAccount(contractorId: string, country: string = 'US'): Promise<{
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
    // Every caller of getOrCreateConnectAccount() in this file is US-only
    // (finaliseBankStripe/createMicrodepositSetupIntent's us_bank_account
    // SetupIntent flow, createExternalAccountFromRouting's hardcoded
    // country: 'US') — the account this method creates below is always
    // country: 'US' too. Custom accounts are single-country, so reusing a
    // real Connect account created for a DIFFERENT country (e.g. a
    // contractor who also has a GB/SEPA method attached via a different
    // flow) fails every US bank-account tokenization against it. bank_country
    // is 'US' on every BANK_STRIPE/BANK_MANUAL-US row, but WISE
    // rows (oauth.service.ts's initiateOAuth) never set it at all — treating
    // NULL as implicitly-US (rather than requiring an exact 'US' match)
    // keeps those legitimate US-context accounts reusable too, while still
    // excluding rows that explicitly recorded a different country.
    // PS-34 §4.2: Custom accounts are single-country, so a Connect account
    // created for 'US' can't be reused for a GB/SEPA/AU/CA contractor and
    // vice versa — matching on the exact requested country (NULL only
    // counts as a match for 'US', preserving the original WISE
    // reasoning below) keeps cross-country reuse from ever being attempted.
    const existing = await this.methodRepo
      .createQueryBuilder('m')
      .where('m.contractor_id = :contractorId', { contractorId })
      .andWhere("m.stripe_connect_account_id LIKE 'acct\\_%' ESCAPE '\\'")
      .andWhere("m.stripe_connect_account_id NOT LIKE 'acct\\_mock%' ESCAPE '\\'")
      .andWhere(
        country === 'US' ? "(m.bank_country = :country OR m.bank_country IS NULL)" : 'm.bank_country = :country',
        { country },
      )
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
      country,
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
  // Wise US routing + account number via fetchBankingDetails() —
  // this is the step that lets Stripe ACH funds directly to the
  // contractor's Wise balance without Marketeq ever calling the
  // Wise Payouts API. Unlike attachVerifiedBankAsExternalAccount
  // (BANK_STRIPE/BANK_MANUAL, which goes through a confirmed SetupIntent +
  // token), Wise never hands payout-service a SetupIntent — the
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

  // ─── PS-34 §4.2: Attach a non-US bank account as a Stripe
  // external_account ────────────────────────────────────────────
  // Field mapping confirmed directly against Stripe's own API reference
  // (docs.stripe.com/api/external_account_bank_accounts/create — the
  // external_account.routing_number field doc: "The routing number, sort
  // code, or other country-appropriate institution number for the bank
  // account... If you are providing an IBAN for account_number, this field
  // is not required."), not guessed:
  //  - SEPA/IBAN countries: account_number = IBAN, routing_number omitted.
  //  - GB: routing_number = sort code, account_number = account number.
  //  - AU: routing_number = BSB, account_number = account number.
  //  - CA: routing_number = "0" + 3-digit institution + 5-digit transit
  //    (the standard CPA EFT routing number Canadian institutions and
  //    Stripe both expect), account_number = account number.
  // This is what unblocks StripeProvider.submitDob() below — that method
  // was already correct/ready but had no external_account to activate
  // transfers for.
  async attachInternationalExternalAccount(params: {
    contractorId: string;
    depositMethodId: string;
    bankCountry: string;
    currency: string;
    accountHolderName: string;
    iban?: string;
    accountNumber?: string;
    sortCode?: string;
    bsbNumber?: string;
    institutionNumber?: string;
    transitNumber?: string;
  }): Promise<{
    connectAccountId: string;
    externalAccountId: string;
    connectPayoutsEnabled: boolean;
    connectRequirementsDue: string[] | null;
  }> {
    const connect = await this.getOrCreateConnectAccount(params.contractorId, params.bankCountry);
    const connectAccountId = connect.accountId;

    let accountNumber: string;
    let routingNumber: string | undefined;
    if (params.iban) {
      accountNumber = params.iban;
    } else if (params.bankCountry === 'CA' && params.institutionNumber && params.transitNumber) {
      accountNumber = params.accountNumber!;
      routingNumber = `0${params.institutionNumber.padStart(3, '0')}${params.transitNumber.padStart(5, '0')}`;
    } else if (params.bankCountry === 'AU' && params.bsbNumber) {
      accountNumber = params.accountNumber!;
      routingNumber = params.bsbNumber;
    } else if (params.sortCode) {
      accountNumber = params.accountNumber!;
      routingNumber = params.sortCode;
    } else {
      accountNumber = params.accountNumber!;
    }

    if (!accountNumber) {
      throw new PayoutError('Missing bank account details for this country.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_BANK_ACCOUNT_VALIDATION_FAILED');
    }

    if (!this.stripe || !this.isRealStripeKey()) {
      return {
        connectAccountId, externalAccountId: `ba_mock_${Date.now()}`,
        connectPayoutsEnabled: connect.payoutsEnabled, connectRequirementsDue: connect.requirementsDue,
      };
    }

    let externalAccount: any;
    try {
      externalAccount = await this.stripe.accounts.createExternalAccount(
        connectAccountId,
        {
          external_account: {
            object: 'bank_account',
            country: params.bankCountry,
            currency: params.currency.toLowerCase(),
            account_number: accountNumber,
            ...(routingNumber ? { routing_number: routingNumber } : {}),
            account_holder_name: params.accountHolderName,
            account_holder_type: 'individual',
          },
        },
        { idempotencyKey: `extaccount-${params.depositMethodId}` },
      );
    } catch (err: any) {
      this.logger.warn(`Stripe external_account attach failed (international) for account ${connectAccountId}: ${err?.message}`);
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
  ): Promise<{
    mode: 'stripe' | 'mock';
    instant?: boolean;
    externalAccountId?: string;
    connectAccountId?: string;
    connectPayoutsEnabled?: boolean;
    connectRequirementsDue?: string[] | null;
  }> {
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

    const result = await this.createMicrodepositSetupIntent(method, {
      account_number: accountNumber,
      routing_number: routingNumber,
      account_holder_type: 'individual',
    }, accountHolderName);

    return { mode: 'stripe', ...result };
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
    // every one of Stripe's documented test account numbers). verifyMicrodeposits()
    // only accepts intents still in requires_action, so calling it on an
    // already-succeeded intent throws — and that error would otherwise be
    // indistinguishable from a genuine wrong-amounts submission below.
    //
    // This skip must NEVER apply with a live key: existing.livemode is false
    // only for test-mode keys, so a production SetupIntent that is somehow
    // already "succeeded" here still goes through verifyMicrodeposits() (and
    // fails loudly) rather than being waved through on unchecked amounts.
    //
    // Product requirement: only Stripe's own documented micro-deposit
    // descriptor-code pairs may pass here — 32/45 (SM11AA, "verifying the
    // account" — succeeds), 10/11 (SM33CC, "exceeding verification
    // attempts"), 40/41 (SM44DD, "microdeposit timeout"). Everything else,
    // including the real-looking pending amounts a real customer would see,
    // must be rejected — there is nothing behind an already-succeeded test
    // intent to actually verify against, so accepting arbitrary amounts here
    // would silently pass amounts that were never really "correct".
    const existing = await this.stripe.setupIntents.retrieve(setupIntentId);
    if (existing.status === 'succeeded' && !existing.livemode) {
      const pair = [amount1, amount2].sort((a, b) => a - b);
      if (pair[0] === 32 && pair[1] === 45) {
        this.logger.log(
          `verifyMicrodepositAmounts: SetupIntent ${setupIntentId} matched Stripe's ` +
          'SM11AA (32/45) success code — treating as verified without a real Stripe call.',
        );
      } else if (pair[0] === 10 && pair[1] === 11) {
        throw new PayoutError(
          'Too many failed attempts.', HttpStatus.TOO_MANY_REQUESTS, 'ERR_SIMULATED_TOO_MANY_ATTEMPTS');
      } else if (pair[0] === 40 && pair[1] === 41) {
        throw new PayoutError(
          'The verification window has expired.', HttpStatus.GONE, 'ERR_SIMULATED_TIMEOUT');
      } else {
        // Not one of Stripe's documented codes — fall through as a plain
        // (non-PayoutError) throw so the caller's normal wrong-amounts
        // handling applies (decrements the real attempt counter, eventually
        // locks after 3 tries) exactly as it would for a genuine mismatch.
        throw new Error('Submitted amounts do not match a documented Stripe test verification code.');
      }
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
  //
  // Race condition: bank-payout-executor.service.ts calls
  // stripe.payouts.create() and only writes externalTransactionId to the DB
  // *after* that call resolves. In Stripe test mode, payout.paid/failed can
  // fire (and reach us, since webhook delivery is otherwise unthrottled)
  // before that write lands, so the externalTransactionId lookup misses on
  // a payout that unambiguously exists. Every Stripe payout we create carries
  // metadata.payoutRequestId (our own primary key, set at creation time —
  // see bank-payout-executor.service.ts), so fall back to that instead of
  // silently dropping the event; also backfill externalTransactionId so any
  // later duplicate delivery matches on the fast path.
  private async findPayoutForWebhook(stripePayout: any): Promise<PayoutRequest | null> {
    let payout = await this.payoutRepo.findOne({ where: { externalTransactionId: stripePayout.id } });
    if (payout) return payout;

    const payoutRequestId = stripePayout.metadata?.payoutRequestId;
    if (!payoutRequestId) return null;

    payout = await this.payoutRepo.findOne({ where: { id: payoutRequestId } });
    if (!payout) return null;

    this.logger.warn(
      `${stripePayout.id} not yet linked to payout ${payout.id} (externalTransactionId write lagged the webhook) — matched via metadata.payoutRequestId instead`,
    );
    await this.payoutRepo.update(payout.id, { externalTransactionId: stripePayout.id });
    return payout;
  }

  async handlePayoutPaid(stripePayout: any) {
    this.logger.log(`Stripe payout.paid: ${stripePayout.id}`);
    const payout = await this.findPayoutForWebhook(stripePayout);
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
    const payout = await this.findPayoutForWebhook(stripePayout);
    if (!payout) {
      this.logger.warn(`payout.failed for unknown externalTransactionId ${stripePayout.id}`);
      return;
    }

    // PS-24 §12: contractor-facing copy for the two most common ACH
    // return reasons — was Stripe's raw failure_message verbatim before,
    // which is developer-facing text ("The bank account has been closed."),
    // not the reviewed contractor copy this doc specifies.
    const achFailureCopy: Record<string, string> = {
      invalid_account_number: 'The bank returned an error for this account number. Please check your details or contact your bank.',
      invalid_account_number_length: 'The bank returned an error for this account number. Please check your details or contact your bank.',
      account_frozen: 'Your bank account is frozen and can\'t receive transfers. Please contact your bank.',
    };
    const reason = achFailureCopy[stripePayout.failure_code] ?? stripePayout.failure_message ?? 'Bank payout failed.';
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

    // PS-39 §5: R02 (account closed), R03 (no account), R10 (unauthorized)
    // mean the bank account itself is dead or the contractor never
    // authorized this account — retrying against it will only fail again.
    // Deactivate so the method drops out of the verified list and the
    // contractor is prompted to add a new one, instead of every future
    // scheduled/manual payout to it silently failing the same way.
    //
    // Stripe's payout.failure_code is its own semantic enum, not a literal
    // NACHA R-code — confirmed against Stripe's Payout object reference
    // (docs.stripe.com/api/payouts/object#payout_object-failure_code).
    // account_closed/no_account map directly to R02/R03; debit_not_authorized
    // is the closest Stripe equivalent to R10 (Stripe merges "not authorized"
    // into the general debit-not-approved code rather than exposing a
    // separate unauthorized-debit reason).
    // account_frozen (PS-24 §12 ERR_ACH_ACCOUNT_FROZEN / R16) added — also a
    // dead end, not something a retry or contractor edit resolves.
    // invalid_account_number (R04) deliberately excluded: PS-24's own
    // recovery CTA for that one is "re-enter bank details," implying a
    // fixable typo, not an account to abandon.
    const deactivateCodes = ['account_closed', 'no_account', 'debit_not_authorized', 'account_frozen'];
    if (deactivateCodes.includes(stripePayout.failure_code)) {
      await this.methodRepo.update(
        { id: payout.depositMethodId } as any,
        { isActive: false, deactivatedAt: new Date(), verificationStatus: VerificationStatus.FAILED },
      );
      await this.auditService.log({
        contractorId: payout.contractorId,
        payoutRequestId: payout.id,
        actorType: 'service',
        actorId: 'stripe-webhook',
        action: 'method.deactivated',
        metadata: { depositMethodId: payout.depositMethodId, achReturnCode: stripePayout.failure_code },
      });
      this.logger.warn(`Deposit method ${payout.depositMethodId} deactivated — ACH return ${stripePayout.failure_code}`);

      // PS-23 §3.5: dedicated event, additive to the audit log above —
      // notification-service/pause-evaluator's spec'd consumer.
      await this.publisher.publishMethodDeactivated({
        contractorId: payout.contractorId,
        depositMethodId: payout.depositMethodId,
        methodType: 'BANK',
        reason: stripePayout.failure_code,
      });

      // debit_not_authorized is the closest Stripe equivalent to NACHA R10
      // (unauthorized debit) — the one deactivation code that signals
      // possible fraud/dispute risk rather than a routine dead account, so
      // it's the one that also escalates to trust-safety-service.
      if (stripePayout.failure_code === 'debit_not_authorized') {
        await this.publisher.publishTrustSafetyEscalation({
          contractorId: payout.contractorId,
          depositMethodId: payout.depositMethodId,
          payoutRequestId: payout.id,
          achReturnCode: stripePayout.failure_code,
          reason: 'Contractor\'s bank reported this debit as unauthorized.',
        });
      }
    }

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
    const payout = await this.findPayoutForWebhook(stripePayout);
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

  // PS-33 §5: an external_account (bank/Wise routing+account) was
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

    // PS-34 §4.3: international BANK_MANUAL methods (UK/SEPA/AU/CA) sit in
    // PENDING after StripeProvider.submitDob() until this webhook reports
    // whether Stripe activated transfers outright or escalated to
    // government ID + selfie. US methods reach VERIFIED through the
    // micro-deposit/instant-verification path in methods.service.ts instead
    // and are unaffected — this only ever touches rows still PENDING.
    const transfers = account.capabilities?.transfers;
    if (transfers === 'active') {
      // Fetch the rows this update is about to touch first — publishStripeKycVerified
      // (PS-40 §3.3) needs the per-method contractorId/depositMethodId/bankCountry,
      // which update()'s UpdateResult (just an affected count) doesn't carry.
      const affectedMethods = await this.methodRepo.find({
        where: {
          stripeConnectAccountId: account.id,
          methodType: MethodType.BANK_MANUAL,
          verificationStatus: VerificationStatus.PENDING,
        } as any,
      });
      const result = await this.methodRepo.update(
        {
          stripeConnectAccountId: account.id,
          methodType: MethodType.BANK_MANUAL,
          verificationStatus: VerificationStatus.PENDING,
        } as any,
        { verificationStatus: VerificationStatus.VERIFIED },
      );
      if (result.affected) {
        this.logger.log(`account.updated: transfers active — ${result.affected} method(s) on ${account.id} marked VERIFIED`);
        for (const method of affectedMethods) {
          await this.publisher.publishStripeKycVerified({
            contractorId: method.contractorId,
            depositMethodId: method.id,
            stripeConnectedAccountId: account.id,
            bankCountry: method.bankCountry ?? '',
          });
        }
      }
      return;
    }

    if (transfers === 'pending' || transfers === 'inactive') {
      const requirements: string[] = account.requirements?.currently_due ?? [];
      const needsId = requirements.some(
        (r) => r.includes('proof_of_liveness') || r.includes('id_number') || r.includes('document'),
      );
      if (needsId) {
        const affectedMethods = await this.methodRepo.find({
          where: {
            stripeConnectAccountId: account.id,
            methodType: MethodType.BANK_MANUAL,
            verificationStatus: VerificationStatus.PENDING,
          } as any,
        });
        const result = await this.methodRepo.update(
          {
            stripeConnectAccountId: account.id,
            methodType: MethodType.BANK_MANUAL,
            verificationStatus: VerificationStatus.PENDING,
          } as any,
          { verificationStatus: VerificationStatus.PENDING_ADDITIONAL_KYC },
        );
        if (result.affected) {
          this.logger.log(`account.updated: Stripe escalated ${account.id} to government ID + selfie — ${result.affected} method(s) marked PENDING_ADDITIONAL_KYC`);
          const kycUrl = await this.createAccountLink(account.id);
          for (const method of affectedMethods) {
            await this.publisher.publishAdditionalKycRequired({
              contractorId: method.contractorId,
              depositMethodId: method.id,
              kycUrl,
              requirements,
            });
          }
        }
      }
    }
  }

  // PS-40 §3.4: the additional_kyc_required event carries a Stripe Account
  // Link URL the contractor follows to complete government ID + selfie.
  // account_onboarding (not account_update) since PENDING_ADDITIONAL_KYC
  // methods haven't finished onboarding yet — Stripe still has outstanding
  // currently_due requirements on the account at this point.
  private async createAccountLink(stripeConnectAccountId: string): Promise<string> {
    if (!this.stripe || !this.isRealStripeKey()) {
      return this.fcReturnUrl;
    }
    const link = await this.stripe.accountLinks.create({
      account: stripeConnectAccountId,
      refresh_url: this.fcReturnUrl,
      return_url: this.fcReturnUrl,
      type: 'account_onboarding',
    });
    return link.url;
  }

  // ─── PS-34 §4.2: Submit DOB to unlock cross-border transfers ────
  // UK/SEPA/AU/CA BANK_MANUAL methods need the account holder's date of
  // birth on file before Stripe will activate the transfers capability.
  // Now called from methods.service.ts's international-bank branch, right
  // after attachInternationalExternalAccount() above gives the connected
  // account a real bank account to activate transfers for. Never marks the
  // method VERIFIED itself — Stripe may activate transfers immediately or
  // escalate to ID verification, and only the account.updated webhook
  // (handleAccountUpdated above) knows which happened.
  async submitDob(params: {
    contractorStripeAccountId: string;
    dateOfBirth: { day: number; month: number; year: number };
    legalFirstName: string;
    legalLastName: string;
  }): Promise<void> {
    if (!this.stripe || !this.isRealStripeKey()) {
      this.logger.log(`[STUB] submitDob for ${params.contractorStripeAccountId} — no real Stripe key configured`);
      return;
    }

    const persons = await this.stripe.accounts.listPersons(params.contractorStripeAccountId);
    const person = persons.data[0];
    if (!person) {
      throw new PayoutError(
        'No person found on connected account — onboarding may be incomplete.',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ERR_STRIPE_PERSON_NOT_FOUND',
      );
    }

    await this.stripe.accounts.updatePerson(params.contractorStripeAccountId, person.id, {
      dob: {
        day: params.dateOfBirth.day,
        month: params.dateOfBirth.month,
        year: params.dateOfBirth.year,
      },
      first_name: params.legalFirstName,
      last_name: params.legalLastName,
    });
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

// apps/payout-service/src/payout/payout.service.ts
// PS-02 + PS-14 + PS-19: Payout service with rate limiting, dedup, execution re-checks
import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService }       from '@nestjs/config';
import { InjectQueue }         from '@nestjs/bull';
import { Queue }               from 'bull';
import { createHash } from 'crypto';

import { PayoutRequest, PayoutStatus, PayoutTrigger, PayoutSpeed } from '../entities/payout-request.entity';
import { DepositMethod, VerificationStatus, MethodType } from '../entities/deposit-method.entity';
import { MagicLinkToken }     from '../entities/magic-link-token.entity';
import { PayoutSchedule }     from '../entities/payout-schedule.entity';
import { EarningsClient }     from '../common/earnings.client';
import { KycClient }          from '../common/kyc.client';
import { UserClient }         from '../common/user.client';
import { AuditService }       from '../audit/audit.service';
import { MagicLinkService }   from '../magic-link/magic-link.service';
import { WithdrawalRateLimitService } from './withdrawal-rate-limit.service';
import { KycGateService }     from '../kyc/kyc-gate.service';
import { EddService }         from '../kyc/edd.service';
import { PayoutError }        from '../common/errors/payout.error';
import { ValidateAmountDto, ValidateAmountResponseDto } from './dto/validate-amount.dto';
import { InitiatePayoutDto, InitiatePayoutResponseDto } from './dto/initiate-payout.dto';
import { VerifyResponseDto }  from './dto/verify-response.dto';
import { PayoutPublisher }    from '../publishers/payout.publisher';
import { PayoutFeeService }   from '../fees/payout-fee.service';
import { PauseStatusService } from '../pause/pause-status.service';

const INSTANT_FEE = '1.75';

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);
  private readonly payoutMinimum: number;

  constructor(
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    @InjectRepository(MagicLinkToken)
    private readonly mlTokenRepo: Repository<MagicLinkToken>,
    @InjectRepository(PayoutSchedule)
    private readonly scheduleRepo: Repository<PayoutSchedule>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly earningsClient: EarningsClient,
    private readonly kycClient: KycClient,
    private readonly userClient: UserClient,
    private readonly auditService: AuditService,
    private readonly magicLinkService: MagicLinkService,
    private readonly rateLimitService: WithdrawalRateLimitService,
    private readonly kycGateService: KycGateService,
    private readonly eddService: EddService,
    private readonly publisher: PayoutPublisher,
    private readonly feeService: PayoutFeeService,
    private readonly pauseStatusService: PauseStatusService,
    @InjectQueue('payout-processing') private readonly queue: Queue,
  ) {
    this.payoutMinimum = parseFloat(this.config.get('PAYOUT_MINIMUM_USD', '50'));
  }

  // ─── Enqueue a QUEUED payout for processing ────────────────────
  // Shared by both the legacy verifyMagicLink() path and MagicLinkService's
  // verifyEmailToken() path (magicLinkService has no queue access itself —
  // the controller calls back into this after a successful verification).
  async enqueueForProcessing(payoutRequestId: string): Promise<void> {
    await this.queue.add('process-payout', { payoutRequestId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: false,
    });
  }

  // ─── US-30/31: GET /v1/payouts/gate-check ──────────────────────
  // Pre-flight check so the withdrawal screen can show the KYC/hold block
  // BEFORE the contractor fills out amount + method (AC-30.01/31.01), instead
  // of only discovering it at final submission. Mirrors the same fail-closed
  // checks initiate() already enforces server-side — this is a UI convenience,
  // not a new authority; initiate() remains the real gate.
  async checkGate(contractorId: string): Promise<{ allowed: boolean; blockedBy?: string; holdReleasesAt?: string; kycRejectionReason?: string }> {
    const kyc = await this.kycClient.getStatus(contractorId);
    // AC-30.04: KYC service unreachable → fail-closed, never fail-open.
    if (kyc.tier === 'unknown') return { allowed: false, blockedBy: 'KYC_SERVICE_UNAVAILABLE' };
    if (kyc.suspended) return { allowed: false, blockedBy: 'ACCOUNT_SUSPENDED' };

    // PS-15 §3.1/§7 checks 1-2: account-level tiers, checkable before the
    // contractor has picked a method (Tier 3 is method-scoped — checked in
    // initiate() once dto.depositMethodId exists, not here). Additive
    // alongside the kyc.status checks below, which come from a different,
    // already-integrated field this pre-flight endpoint also honors.
    // Caught rather than left to propagate — this endpoint's contract is
    // "always return a structured { allowed, blockedBy } body," never a
    // thrown 503, and getGateStatus() throws independently of the kyc.tier
    // check above (a separate network call that can fail on its own).
    try {
      const gateStatus = await this.kycClient.getGateStatus(contractorId);
      if (gateStatus.tier1.blocksWithdrawal) return { allowed: false, blockedBy: 'TIER_1' };
      if (gateStatus.tier2.blocksWithdrawal) return { allowed: false, blockedBy: 'TIER_2' };
    } catch {
      return { allowed: false, blockedBy: 'KYC_SERVICE_UNAVAILABLE' };
    }

    // Doc08 ERR-35/36/37: identity-review status, when kyc-identity-service
    // returns one — undefined `status` (current MVP contract) falls through to
    // the existing tier-based checks below rather than blocking on absence,
    // since this field isn't guaranteed by the upstream contract yet.
    if (kyc.status === 'not_started') return { allowed: false, blockedBy: 'KYC_NOT_STARTED' };
    if (kyc.status === 'in_review') return { allowed: false, blockedBy: 'KYC_IN_REVIEW' };
    if (kyc.status === 'rejected') return { allowed: false, blockedBy: 'KYC_REJECTED', kycRejectionReason: kyc.rejectionReason };
    // AC-31.02(b)/31.03: the hold-lift date must come from the backend, never be
    // calculated client-side. kyc.firstPayoutHold (external kyc-identity-service)
    // carries no date at all, so the self-contained, date-computing check in
    // KycGateService (first-payout-hold based on this contractor's own payout
    // history) is the authoritative source here — kept in sync with initiate().
    const hold = await this.kycGateService.checkFirstPayoutHold(contractorId);
    if (kyc.firstPayoutHold || hold.holdActive) {
      return { allowed: false, blockedBy: 'FIRST_PAYOUT_HOLD', holdReleasesAt: hold.releasesAt?.toISOString() };
    }
    return { allowed: true };
  }

  // ─── Step 1+2: Validate Amount ────────────────────────────────
  async validateAmount(contractorId: string, dto: ValidateAmountDto): Promise<ValidateAmountResponseDto> {
    const amount = parseFloat(dto.amountUsd);

    if (isNaN(amount) || amount <= 0) {
      throw new PayoutError('The amount entered is not valid.',
        HttpStatus.BAD_REQUEST, 'ERR_PAYOUT_INVALID_AMOUNT');
    }
    // PS-19 §4.1: Minimum $50 withdrawal (both frontend + backend)
    if (amount < this.payoutMinimum) {
      throw new PayoutError(`The minimum withdrawal amount is $${this.payoutMinimum}.`,
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_BELOW_MINIMUM_AMOUNT');
    }
    if (!['instant', 'standard'].includes(dto.speed)) {
      throw new PayoutError('Speed must be instant or standard.',
        HttpStatus.BAD_REQUEST, 'ERR_PAYOUT_INVALID_SPEED');
    }

    // Fresh balance read — never cached
    const balance = await this.earningsClient.getBalance(contractorId);
    const available = parseFloat(balance.availableBalance);

    if (amount > available) {
      // ERR-02/ERR-11: the mandated copy names the actual current balance —
      // callers read availableBalanceUsd off the error body to interpolate it.
      throw new PayoutError('Your available balance is insufficient for this withdrawal.',
        HttpStatus.BAD_REQUEST, 'ERR_INSUFFICIENT_BALANCE', { availableBalanceUsd: available.toFixed(2) });
    }

    await this.checkReserveBalance(contractorId, amount, available, dto.ignoreReserve);

    const instantFee = parseFloat(INSTANT_FEE);
    const standardNet = amount;
    const instantNet = amount - instantFee;

    if (dto.speed === 'instant' && instantNet <= 0) {
      throw new PayoutError('The instant withdrawal fee exceeds the requested amount.',
        HttpStatus.BAD_REQUEST, 'ERR_PAYOUT_FEE_EXCEEDS_AMOUNT');
    }

    const fee = dto.speed === 'instant' ? instantFee : 0;
    const net = amount - fee;

    // PS-25 §3.1: the minimum applies to the NET amount, not the gross
    // request — a $50 request with a fee taken out must not settle below
    // the $50 floor this platform otherwise enforces everywhere else.
    if (net < this.payoutMinimum) {
      throw new PayoutError(
        `After fees, this withdrawal would be below the $${this.payoutMinimum} minimum.`,
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_INSUFFICIENT_FUNDS_AFTER_FEE',
      );
    }

    return {
      amountUsd:           amount.toFixed(2),
      speed:               dto.speed,
      feeUsd:              fee.toFixed(2),
      netAmountUsd:        net.toFixed(2),
      availableBalanceUsd: available.toFixed(2),
      balanceAfterUsd:     (available - amount).toFixed(2),
      meetsMinimum:        true,
      standardPreview:     { feeUsd: '0.00', netAmountUsd: standardNet.toFixed(2) },
      instantPreview:      { feeUsd: INSTANT_FEE, netAmountUsd: instantNet.toFixed(2) },
    };
  }

  // ─── Step 3: List Methods ─────────────────────────────────────
  async getVerifiedMethods(contractorId: string) {
    const methods = await this.methodRepo.find({
      where: { contractorId, isActive: true, verificationStatus: VerificationStatus.VERIFIED },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
    return {
      methods: methods.map(m => ({
        id: m.id,
        methodType: m.methodType,
        displayLabel: m.displayLabel,
        isDefault: m.isDefault,
        verificationStatus: m.verificationStatus,
        bankCurrency: m.bankCurrency,
        bankCountry: m.bankCountry,
      })),
    };
  }

  // ─── Step 4: Initiate ─────────────────────────────────────────
  async initiate(contractorId: string, dto: InitiatePayoutDto, contractorEmail?: string): Promise<InitiatePayoutResponseDto> {
    // PS-19 §3.1: Idempotency check
    const existing = await this.payoutRepo.findOne({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existing) return { ...this.toInitiateResponse(existing), replayed: true };

    // PS-16 §6: "payout-service must check for active pause conditions
    // before every withdrawal initiation" — assertNotPaused() was already
    // wired into the scheduled-payout cron but never called here, so manual
    // withdrawals silently skipped NO_DEFAULT_METHOD/DEFAULT_METHOD_DEACTIVATED
    // (the two conditions with no equivalent inline check below).
    await this.pauseStatusService.assertNotPaused(contractorId);

    // PS-19 §3.2: Rate limit — 5 manual withdrawals per hour
    await this.rateLimitService.checkWithdrawalRateLimit(contractorId);

    // PS-19 §4.1: Minimum amount check (backend enforcement)
    const requestedAmount = parseFloat(dto.amountUsd);
    if (requestedAmount < this.payoutMinimum) {
      throw new PayoutError(`The minimum withdrawal amount is $${this.payoutMinimum}.`,
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_BELOW_MINIMUM_AMOUNT');
    }

    // PS-19 §3.3 + §3.5: Fresh balance check (insufficient balance)
    const balance = await this.earningsClient.getBalance(contractorId);
    if (!balance || parseFloat(balance.availableBalance) < requestedAmount) {
      // ERR-11: same rationale as validateAmount() above — name the current balance.
      throw new PayoutError('Your available balance is insufficient for this withdrawal.',
        HttpStatus.BAD_REQUEST, 'ERR_INSUFFICIENT_BALANCE',
        { availableBalanceUsd: balance ? parseFloat(balance.availableBalance).toFixed(2) : undefined });
    }

    await this.checkReserveBalance(contractorId, requestedAmount, parseFloat(balance.availableBalance), dto.ignoreReserve);

    // Validate deposit method — kept ahead of the tiered gate below so an
    // unverified/pending-biometric bank method keeps returning its existing,
    // frontend-handled code (ERR_METHOD_PENDING_BIOMETRIC/
    // ERR_PAYOUT_METHOD_UNVERIFIED) instead of being masked by the tiered
    // gate's ERR_KYC_TIER3_REQUIRED, which transfer-funds/page.tsx and
    // withdraw-funds-dialog.tsx don't know how to recover from.
    const method = await this.methodRepo.findOne({
      where: { id: dto.depositMethodId, contractorId, isActive: true },
    });
    if (!method) throw new PayoutError('Deposit method not found.',
      HttpStatus.NOT_FOUND, 'ERR_PAYOUT_METHOD_NOT_FOUND');
    // PS-35 §9 pre-flight check 4: a method still awaiting (or that failed)
    // biometric verification gets its own error code/copy — distinct from
    // the generic "not verified" below — so the contractor is told to
    // complete identity verification, not to re-add the method.
    if (
      method.verificationStatus === VerificationStatus.PENDING_BIOMETRIC ||
      method.verificationStatus === VerificationStatus.VERIFICATION_FAILED
    ) {
      throw new PayoutError(
        'This payout method is awaiting identity verification and cannot be used yet.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_METHOD_PENDING_BIOMETRIC');
    }
    if (method.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new PayoutError('This deposit method has not been verified yet.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_PAYOUT_METHOD_UNVERIFIED');
    }
    // PS-09 v2.0 §11: a manual withdrawal to a method whose OAuth token
    // refresh has failed must be blocked until the contractor re-authorizes.
    if ((method as any).reauthRequired) {
      throw new PayoutError('Your Wise connection needs to be re-authorized before you can withdraw to this method.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_PAYOUT_METHOD_REAUTH_REQUIRED', { depositMethodId: method.id });
    }
    if (method.methodType === MethodType.TEQ_COIN && !this.config.get('FEATURE_TEQ_COIN_ENABLED', false)) {
      throw new PayoutError('This payout method is not currently available.',
        HttpStatus.BAD_REQUEST, 'ERR_PAYOUT_METHOD_UNAVAILABLE');
    }

    // Legacy kyc.status checks — kept ahead of the tiered gate below (and
    // its FIRST_PAYOUT_HOLD case) so a not_started/in_review/rejected
    // contractor keeps getting that specific code instead of the hold's
    // "this will lift automatically" message, which would be wrong for
    // them. This is the invariant the comment this replaced described:
    // "kept consistent with checkGate() so a contractor who passes the
    // pre-flight gate can't still be blocked here (or vice versa)" — the
    // pre-flight GET /v1/payouts/gate-check runs these same checks first,
    // so initiate() must match that order.
    const kyc = await this.kycClient.getStatus(contractorId);
    if (kyc.suspended) {
      throw new PayoutError('Your account is suspended.',
        HttpStatus.FORBIDDEN, 'ERR_PAYOUT_ACCOUNT_SUSPENDED');
    }
    if (kyc.status === 'not_started') {
      throw new PayoutError('You need to complete identity verification before you can withdraw funds.',
        HttpStatus.FORBIDDEN, 'ERR_KYC_NOT_STARTED');
    }
    if (kyc.status === 'in_review') {
      throw new PayoutError('Your identity verification is under review.',
        HttpStatus.FORBIDDEN, 'ERR_KYC_IN_REVIEW');
    }
    if (kyc.status === 'rejected') {
      throw new PayoutError('Your identity verification was unsuccessful. Please contact support for assistance.',
        HttpStatus.FORBIDDEN, 'ERR_KYC_REJECTED', { rejectionReason: kyc.rejectionReason });
    }

    // PS-15 §3.2/§7: the real tiered gate — checkGate() throws for
    // suspended/service-unavailable and returns { allowed: false,
    // blockedBy: 'TIER_1'|'TIER_2'|'TIER_3'|'FIRST_PAYOUT_HOLD' } for
    // everything else. This used to be an ad-hoc, non-tiered check against
    // a different (already-integrated) status field — PS-15's own error
    // codes (ERR_KYC_TIER1_REQUIRED/TIER2_REQUIRED/TIER3_REQUIRED) never
    // existed anywhere in code. Tier1/Tier2 are new here; Tier3 and the
    // first-payout hold were already correctly gated above/below and are
    // now folded into the same single check instead of two separate ones.
    // By this point the method above is already confirmed VERIFIED and
    // kyc.status already confirmed approved, so the only new things this
    // can still block on are TIER_1/TIER_2 (kyc-identity-service tiers this
    // service didn't check yet) and FIRST_PAYOUT_HOLD.
    const gate = await this.kycGateService.checkGate(contractorId, dto.depositMethodId);
    if (!gate.allowed) {
      switch (gate.blockedBy) {
        case 'TIER_1':
          throw new PayoutError('You need to complete identity verification before you can withdraw funds.',
            HttpStatus.FORBIDDEN, 'ERR_KYC_TIER1_REQUIRED');
        case 'TIER_2':
          throw new PayoutError('You need to add your tax information before you can withdraw funds.',
            HttpStatus.FORBIDDEN, 'ERR_KYC_TIER2_REQUIRED', { subType: gate.tier2SubType });
        case 'TIER_3':
          throw new PayoutError('This bank account has not been verified yet.',
            HttpStatus.FORBIDDEN, 'ERR_KYC_TIER3_REQUIRED', { depositMethodId: gate.depositMethodId });
        case 'FIRST_PAYOUT_HOLD':
          throw new PayoutError(
            'Your first payout is on hold. This is a standard verification step.',
            HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_PAYOUT_FIRST_HOLD', { holdReleasesAt: gate.holdReleasesAt });
      }
    }

    // The external first-payout hold kyc-identity-service signals (PS-00 §5).
    // checkGate() above only computes the local, payout-history-based hold, so
    // without this the pre-flight gate-check (which honours both) would show
    // "on hold" while submit went straight through. Checked last, after the
    // tiers, to match the pre-flight order.
    if (kyc.firstPayoutHold) {
      throw new PayoutError('Your first payout is on hold. This is a standard verification step.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_PAYOUT_FIRST_HOLD');
    }

    // Calculate fee — instant-speed surcharge (PS-19) plus, for
    // international BANK_MANUAL methods, PS-34 §3's country-based transfer
    // fee (both contractor-paid, both shown before the contractor already
    // confirmed via the magic link — see validateAmount() for the preview
    // shown pre-confirmation).
    const instantFee = dto.speed === 'instant' ? parseFloat(INSTANT_FEE) : 0;
    const intlFee = this.feeService.calculateFee({
      amountUsd: requestedAmount,
      methodType: method.methodType,
      bankCountry: method.bankCountry ?? undefined,
    }).feeUsd;
    const feeUsd = (instantFee + intlFee).toFixed(2);
    const netAmountUsd = (parseFloat(dto.amountUsd) - parseFloat(feeUsd)).toFixed(8);
    if (parseFloat(netAmountUsd) <= 0) {
      throw new PayoutError('The instant withdrawal fee exceeds the requested amount.',
        HttpStatus.BAD_REQUEST, 'ERR_PAYOUT_FEE_EXCEEDS_AMOUNT');
    }
    // PS-25 §3.1: same net-below-minimum guard as validateAmount() above —
    // kept consistent so a request that passed the preview can't still be
    // rejected here (or vice versa) by two different minimum computations.
    if (parseFloat(netAmountUsd) < this.payoutMinimum) {
      throw new PayoutError(
        `After fees, this withdrawal would be below the $${this.payoutMinimum} minimum.`,
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_INSUFFICIENT_FUNDS_AFTER_FEE',
      );
    }

    // PS-15 §6.2: Enhanced Due Diligence — payouts >= $10,000 skip the normal
    // magic-link confirmation and go straight to a compliance-review hold.
    // This was previously computed (checkEDD/publishEddEvent both existed)
    // but never called from anywhere — every payout, regardless of size,
    // went straight through. requiresEDD payouts get their own row/branch
    // rather than reusing the magic-link transaction below, since there is
    // nothing for the contractor to confirm here — compliance approval is
    // the confirmation.
    const edd = await this.eddService.checkEDD(requestedAmount, contractorId);
    if (edd.requiresEDD) {
      const eddRequest = await this.dataSource.transaction(async (em) => {
        const req = em.create(PayoutRequest, {
          contractorId, idempotencyKey: dto.idempotencyKey,
          trigger: PayoutTrigger.MANUAL,
          status: PayoutStatus.AWAITING_EDD,
          amountUsd: dto.amountUsd, feeUsd, netAmountUsd,
          currency: 'USD',
          speed: dto.speed as PayoutSpeed,
        });
        (req as any).depositMethodId = dto.depositMethodId;
        await em.save(req);

        await this.auditService.log({
          contractorId, payoutRequestId: req.id,
          actorType: 'contractor', actorId: contractorId,
          action: 'withdrawal.initiated',
          newStatus: PayoutStatus.AWAITING_EDD,
        });

        return req;
      });

      await this.eddService.publishEddEvent({
        payoutRequestId: eddRequest.id,
        contractorId,
        amountUSD: requestedAmount,
        depositMethodId: dto.depositMethodId,
        methodType: method.methodType,
      });

      await this.publisher.publishPayoutInitiated({
        contractorId, payoutRequestId: eddRequest.id, contractId: null,
        amount: eddRequest.amountUsd,
        methodType: method.methodType,
        methodLabel: method.displayLabel ?? method.methodType,
        methodIdentifier: method.accountIdentifier ?? method.bankAccountLast4 ?? '',
        initiatedAt: new Date().toISOString(),
      });

      return {
        payoutRequestId: eddRequest.id,
        status: PayoutStatus.AWAITING_EDD,
        amountUsd: parseFloat(eddRequest.amountUsd).toFixed(2),
        feeUsd: parseFloat(eddRequest.feeUsd).toFixed(2),
        netAmountUsd: parseFloat(eddRequest.netAmountUsd).toFixed(2),
        magicLinkSentTo: '',
        magicLinkExpiresAt: '',
        message: `Withdrawals of $${this.eddService.getThreshold().toLocaleString()} or more require a compliance review before they can be sent. We'll notify you once it's approved — no further action is needed from you right now.`,
      };
    }

    // Create the payout_request first, then generate its magic-link token via
    // MagicLinkService's own store (Redis + MagicLinkVerification) — this is the
    // ONLY token store verify-email actually reads. Previously this method wrote
    // to a separate, unrelated MagicLinkToken table that GET /verify-email never
    // looked at, so every real withdrawal's confirmation link came back "expired"
    // on first click. resendVerification() already used MagicLinkService's store,
    // so this also makes the initial send and resend consistent with each other.
    const request = await this.dataSource.transaction(async (em) => {
      const req = em.create(PayoutRequest, {
        contractorId, idempotencyKey: dto.idempotencyKey,
        trigger: PayoutTrigger.MANUAL,
        status: PayoutStatus.PENDING_VERIFICATION,
        amountUsd: dto.amountUsd, feeUsd, netAmountUsd,
        currency: 'USD',
        speed: dto.speed as PayoutSpeed,
      });
      (req as any).depositMethodId = dto.depositMethodId;
      await em.save(req);

      await this.auditService.log({
        contractorId, payoutRequestId: req.id,
        actorType: 'contractor', actorId: contractorId,
        action: 'withdrawal.initiated',
        newStatus: PayoutStatus.PENDING_VERIFICATION,
      });

      return req;
    });

    await this.publisher.publishPayoutInitiated({
      contractorId, payoutRequestId: request.id, contractId: null,
      amount: request.amountUsd,
      methodType: method.methodType,
      methodLabel: method.displayLabel ?? method.methodType,
      methodIdentifier: method.accountIdentifier ?? method.bankAccountLast4 ?? '',
      initiatedAt: new Date().toISOString(),
    });

    const rawToken = await this.magicLinkService.generateAndStore(request.id, contractorId);
    const expiresAt = new Date(Date.now() + this.magicLinkService.getTtlMs());
    this.magicLinkService.publishMagicLinkEvent(request, rawToken, contractorEmail, dto.redirectUrl).catch(err =>
      this.logger.error('Magic link send failed', err.message),
    );

    return this.toInitiateResponseFull(request, expiresAt, contractorEmail);
  }

  // ─── PS-19 §3.3: Execution-time balance re-check ─────────────
  async recheckBalanceAtExecution(
    contractorId: string,
    payoutRequestId: string,
    amountUsd: number,
  ): Promise<boolean> {
    try {
      const balance = await this.earningsClient.getBalance(contractorId);
      const available = parseFloat(balance?.availableBalance ?? '0');
      if (available < amountUsd) {
        // PS-24 §3: ERR_INSUFFICIENT_BALANCE_AT_EXECUTION — balance dropped
        // between initiation and execution. Was a bare non-ERR_-prefixed
        // constant before; every other failureReason on this entity is a
        // contractor-readable sentence, so this now matches the doc's
        // userMessage instead of being the odd one out.
        await this.payoutRepo.update(payoutRequestId, {
          status: PayoutStatus.FAILED,
          failureReason: 'Your balance changed before your withdrawal could be sent. Please start a new withdrawal.',
          failedAt: new Date(),
        });
        this.logger.warn(`Payout ${payoutRequestId} failed: balance $${available} < required $${amountUsd}`);
        return false;
      }
      return true;
    } catch {
      this.logger.error(`Balance re-check failed for payout ${payoutRequestId}`);
      return false;
    }
  }

  // ─── PS-19 §3.4: Execution-time KYC re-check ─────────────────
  async recheckKycAtExecution(
    contractorId: string,
    payoutRequestId: string,
  ): Promise<boolean> {
    try {
      const kyc = await this.kycClient.getStatus(contractorId);
      if (kyc.suspended || kyc.firstPayoutHold) {
        const reason = kyc.suspended ? 'KYC_SUSPENDED_AT_EXECUTION' : 'KYC_HOLD_AT_EXECUTION';
        await this.payoutRepo.update(payoutRequestId, {
          status: PayoutStatus.FAILED,
          failureReason: reason,
          failedAt: new Date(),
        });
        this.logger.warn(`Payout ${payoutRequestId} failed: KYC re-check failed (${reason})`);
        return false;
      }
      return true;
    } catch {
      this.logger.error(`KYC re-check failed for payout ${payoutRequestId}`);
      return false;
    }
  }

  // ─── Step 5: Verify Magic Link ────────────────────────────────
  async verifyMagicLink(rawToken: string): Promise<VerifyResponseDto> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const mlToken = await this.mlTokenRepo.findOne({
      where: { tokenHash, isUsed: false },
    });

    if (!mlToken) throw new PayoutError('This link is invalid.',
      HttpStatus.BAD_REQUEST, 'ERR_PAYOUT_MAGIC_LINK_INVALID');
    if (mlToken.expiresAt < new Date()) throw new PayoutError(
      'This link has expired. Please initiate a new withdrawal.',
      HttpStatus.BAD_REQUEST, 'ERR_PAYOUT_MAGIC_LINK_EXPIRED');

    const request = await this.payoutRepo.findOne({
      where: { magicLinkTokenId: mlToken.id } as any,
    });

    if (!request) throw new PayoutError('Payout request not found.',
      HttpStatus.NOT_FOUND, 'ERR_PAYOUT_NOT_FOUND');

    if (request.status !== PayoutStatus.PENDING_VERIFICATION) {
      return { payoutRequestId: request.id, status: request.status };
    }

    // Instant hold: debit available_balance the moment the withdrawal is
    // confirmed, rather than waiting for the provider's completion webhook
    // (which can take minutes to days). Placed before the QUEUED transaction
    // commits below so a hold failure (insufficient balance, race with
    // another concurrent withdrawal) fails the request instead of leaving a
    // QUEUED payout with no funds actually reserved for it.
    const held = await this.earningsClient.holdBalance(request.contractorId, request.amountUsd);
    if (!held) {
      await this.dataSource.transaction(async (em) => {
        await em.update(MagicLinkToken, mlToken.id, { isUsed: true, usedAt: new Date() });
        await em.update(PayoutRequest, request.id, {
          status: PayoutStatus.FAILED,
          failureReason: 'Your available balance is insufficient for this withdrawal.',
          failedAt: new Date(),
        });
        await this.auditService.log({
          contractorId: request.contractorId,
          payoutRequestId: request.id,
          actorType: 'contractor', actorId: request.contractorId,
          action: 'withdrawal.hold_failed',
          previousStatus: PayoutStatus.PENDING_VERIFICATION,
          newStatus: PayoutStatus.FAILED,
        });
      });
      return {
        payoutRequestId: request.id,
        status: PayoutStatus.FAILED,
        message: 'Your available balance is insufficient for this withdrawal.',
      };
    }

    await this.dataSource.transaction(async (em) => {
      await em.update(MagicLinkToken, mlToken.id, { isUsed: true, usedAt: new Date() });
      await em.update(PayoutRequest, request.id, {
        status: PayoutStatus.QUEUED,
        verifiedAt: new Date(),
        queuedAt: new Date(),
      });
      await this.auditService.log({
        contractorId: request.contractorId,
        payoutRequestId: request.id,
        actorType: 'contractor', actorId: request.contractorId,
        action: 'magic_link.verified',
        previousStatus: PayoutStatus.PENDING_VERIFICATION,
        newStatus: PayoutStatus.QUEUED,
      });
    });

    await this.queue.add('process-payout', { payoutRequestId: request.id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: false,
    });

    return {
      payoutRequestId: request.id,
      status: PayoutStatus.QUEUED,
      message: 'Your withdrawal has been confirmed and is being processed.',
    };
  }

  // ─── PS-15 §6.2: Admin — list payouts awaiting EDD review ──────
  async listAwaitingEDD(): Promise<PayoutRequest[]> {
    return this.payoutRepo.find({
      where: { status: PayoutStatus.AWAITING_EDD },
      order: { createdAt: 'ASC' },
    });
  }

  // ─── PS-15 §6.2/§6.3: Admin — release a payout past EDD review ──
  // PS-15 §6.3's callout is explicit: "When a payout is approved after EDD
  // review, a fresh magic link is sent to the contractor... This ensures the
  // contractor re-confirms the withdrawal after the compliance delay, in
  // case the contractor's intent has changed during the review period."
  // Previously went straight to QUEUED — compliance approval was being
  // treated as the contractor's confirmation, skipping the re-confirmation
  // step entirely. Now mirrors §7 check 6 exactly: PENDING_VERIFICATION +
  // a fresh magic link, same as the normal (non-EDD) flow. The existing
  // GET /v1/payouts/verify-email endpoint (magicLinkService.verifyEmailToken)
  // handles the balance hold + QUEUED transition + enqueue once the
  // contractor actually clicks it — nothing EDD-specific needed there.
  async releaseEDD(payoutRequestId: string, actorId: string, contractorEmail?: string): Promise<{ status: string }> {
    const request = await this.payoutRepo.findOne({ where: { id: payoutRequestId } });
    if (!request) throw new PayoutError('Payout request not found.',
      HttpStatus.NOT_FOUND, 'ERR_PAYOUT_NOT_FOUND');
    if (request.status !== PayoutStatus.AWAITING_EDD) {
      throw new PayoutError('This payout is not awaiting EDD review.',
        HttpStatus.CONFLICT, 'ERR_PAYOUT_NOT_AWAITING_EDD');
    }

    await this.dataSource.transaction(async (em) => {
      await em.update(PayoutRequest, request.id, {
        status: PayoutStatus.PENDING_VERIFICATION,
      });
      await this.auditService.log({
        contractorId: request.contractorId,
        payoutRequestId: request.id,
        actorType: 'admin', actorId,
        action: 'edd.released',
        previousStatus: PayoutStatus.AWAITING_EDD,
        newStatus: PayoutStatus.PENDING_VERIFICATION,
      });
    });

    // Reviewer-caught bug: the approving admin's JWT carries the ADMIN's
    // email, not the contractor's — without resolving the real one here,
    // publishMagicLinkEvent() silently sends nothing (it only logs a dev
    // warning when contractorEmail is unset) and the contractor is never
    // told there's a link to click.
    const resolvedEmail = contractorEmail ?? await this.userClient.getContractorEmail(request.contractorId) ?? undefined;

    const rawToken = await this.magicLinkService.generateAndStore(request.id, request.contractorId);
    await this.magicLinkService.publishMagicLinkEvent(request, rawToken, resolvedEmail);

    return { status: 'pending_verification' };
  }

  // ─── Cancel ───────────────────────────────────────────────────
  async cancel(contractorId: string, payoutRequestId: string): Promise<{ status: string }> {
    const request = await this.payoutRepo.findOne({
      where: { id: payoutRequestId, contractorId },
    });

    if (!request) throw new PayoutError('Payout request not found.',
      HttpStatus.NOT_FOUND, 'ERR_PAYOUT_NOT_FOUND');

    if (request.status === PayoutStatus.CANCELLED) {
      return { status: 'cancelled' };
    }
    if (request.status === PayoutStatus.PROCESSING) {
      throw new PayoutError('Cannot cancel — payout is already being processed.',
        HttpStatus.CONFLICT, 'ERR_PAYOUT_ALREADY_PROCESSING');
    }
    if (request.status === PayoutStatus.COMPLETED) {
      throw new PayoutError('Cannot cancel — payout has already completed.',
        HttpStatus.CONFLICT, 'ERR_PAYOUT_ALREADY_COMPLETED');
    }
    if (request.status === PayoutStatus.FAILED) {
      throw new PayoutError('Cannot cancel — payout has already failed. Start a new request.',
        HttpStatus.CONFLICT, 'ERR_PAYOUT_ALREADY_FAILED');
    }

    await this.dataSource.transaction(async (em) => {
      await em.update(PayoutRequest, request.id, {
        status: PayoutStatus.CANCELLED,
        cancelledAt: new Date(),
      });

      if ((request as any).magicLinkTokenId) {
        await em.update(MagicLinkToken, (request as any).magicLinkTokenId, {
          isUsed: true, usedAt: new Date(),
        });
      }

      await this.auditService.log({
        contractorId, payoutRequestId: request.id,
        actorType: 'contractor', actorId: contractorId,
        action: 'payout.cancelled',
        previousStatus: request.status,
        newStatus: PayoutStatus.CANCELLED,
      });
    });

    if (request.status === PayoutStatus.QUEUED) {
      const jobs = await (this.queue as any).getJobs(['waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data?.payoutRequestId === request.id) {
          await job.remove();
          break;
        }
      }

      // A hold was only ever placed if this request went through magic-link
      // verification (verifiedAt gets set there, right before holdBalance is
      // called) — QUEUED alone isn't enough to infer that. Scheduled payouts
      // (schedule-execution.cron.ts) are created directly at QUEUED and never
      // hold, so refunding them unconditionally here would credit balance
      // that was never debited. Only restore when verifiedAt is set.
      if (request.verifiedAt) {
        await this.publisher.publishPayoutFailed({
          contractorId, payoutRequestId: request.id,
          amount: request.amountUsd, currency: request.currency ?? 'USD',
          methodType: 'CANCELLED', reason: 'Withdrawal cancelled by contractor.',
          failedAt: new Date().toISOString(),
        });
      }
    }

    // PS-14 §10, PS-23 §3.5: the dedicated event, additive to the balance
    // restoration above — notification-service's spec'd consumer.
    await this.publisher.publishPayoutCancelled({
      payoutRequestId: request.id,
      contractorId,
      reason: 'contractor_cancelled',
      message: 'Your withdrawal request was cancelled.',
    });

    return { status: 'cancelled' };
  }

  // ─── Figma "Total Payouts This Month" stat card ────────────────
  // Sums completed payouts by completedAt within the current calendar month
  // (UTC), plus the prior month for the "+X% from last month" comparison —
  // mirrors the pattern earnings-service uses for its own summary cards.
  async getMonthlySummary(contractorId: string) {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    const sumBetween = async (from: Date, to: Date) => {
      const row = await this.payoutRepo.createQueryBuilder('p')
        .select('COALESCE(SUM(p.netAmountUsd), 0)', 'total')
        .where('p.contractorId = :contractorId', { contractorId })
        .andWhere('p.status = :status', { status: PayoutStatus.COMPLETED })
        .andWhere('p.completedAt >= :from', { from })
        .andWhere('p.completedAt < :to', { to })
        .getRawOne();
      return parseFloat(row?.total ?? '0');
    };

    const thisMonthTotal = await sumBetween(monthStart, now);
    const lastMonthTotal = await sumBetween(lastMonthStart, monthStart);

    let changePercent: number | null = null;
    if (lastMonthTotal > 0) {
      changePercent = Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 1000) / 10;
    }

    // Figma "Lifetime Payouts" card's "Since <date>" sublabel — the earliest
    // completed payout, i.e. the start of this contractor's real payout history.
    const sinceRow = await this.payoutRepo.createQueryBuilder('p')
      .select('MIN(p.completedAt)', 'since')
      .where('p.contractorId = :contractorId', { contractorId })
      .andWhere('p.status = :status', { status: PayoutStatus.COMPLETED })
      .getRawOne();

    // Figma "Next Payout" card's blue status label (e.g. "Processing...") —
    // reflects whatever payout request is actually in flight right now, not a
    // fabricated value. Null when nothing has been initiated for the next cycle yet.
    //
    // Must require dm.isActive: a payout can be deactivated on its deposit
    // method (PS-33 §8, e.g. a bank rejection with failure_code
    // account_closed/no_account/debit_not_authorized) while the payout row
    // itself is still stuck in a non-terminal status — its own terminal
    // transition depends on a Stripe webhook that may never arrive (same
    // class of gap as the connect_payouts_enabled/transfer-reversal fixes
    // above). Without this filter, a contractor whose only payout method has
    // been deactivated still sees "Processing..." indefinitely, which is
    // inconsistent with their actual (methodless) payout-method state.
    const NON_TERMINAL = [
      PayoutStatus.PENDING_VERIFICATION, PayoutStatus.AWAITING_EDD,
      PayoutStatus.QUEUED, PayoutStatus.PROCESSING,
    ];
    const inFlight = await this.payoutRepo.createQueryBuilder('p')
      .innerJoinAndSelect('p.depositMethod', 'dm')
      .where('p.contractorId = :contractorId', { contractorId })
      .andWhere('p.status IN (:...statuses)', { statuses: NON_TERMINAL })
      .andWhere('dm.isActive = true')
      .orderBy('p.createdAt', 'DESC')
      .getOne();

    return {
      thisMonthTotalUsd: thisMonthTotal.toFixed(2),
      lastMonthTotalUsd: lastMonthTotal.toFixed(2),
      changePercent,
      changeDirection: changePercent === null ? 'unchanged' : changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'unchanged',
      sinceDate: sinceRow?.since ? new Date(sinceRow.since).toISOString() : null,
      nextPayoutStatus: inFlight?.status ?? null,
      // "Where Is My Deposit?" toast (Payouts page header) — real ETA for
      // whatever payout is actually in flight, instead of a static disclaimer.
      nextPayoutEstimatedArrival: inFlight ? this.estimateArrival(inFlight) : null,
      nextPayoutAmountUsd: inFlight ? parseFloat(inFlight.netAmountUsd).toFixed(2) : null,
    };
  }

  private parsePayoutDateParam(value?: string): Date | null {
    if (!value) return null;
    const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (day) {
      return new Date(Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3])));
    }
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  // Figma "All Time" date-range filter — resolves against p.createdAt (the
  // "Initiated on" column), same field the table itself is sorted by.
  private resolvePayoutDateRange(
    dateRange?: string, fromIso?: string, toIso?: string,
  ): { from: Date | null; to: Date | null } {
    if (dateRange === 'custom' || ((!dateRange || dateRange === 'custom') && (fromIso || toIso))) {
      const from = this.parsePayoutDateParam(fromIso);
      const toStart = this.parsePayoutDateParam(toIso);
      const to = toStart
        ? new Date(Date.UTC(toStart.getUTCFullYear(), toStart.getUTCMonth(), toStart.getUTCDate() + 1))
        : null;
      return { from, to };
    }
    if (!dateRange || dateRange === 'all_time') return { from: null, to: null };
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    switch (dateRange) {
      case 'today':
        return { from: todayStart, to: null };
      case 'yesterday': {
        const y = new Date(todayStart); y.setUTCDate(y.getUTCDate() - 1);
        return { from: y, to: todayStart };
      }
      case 'this_week': {
        const s = new Date(todayStart); s.setUTCDate(s.getUTCDate() - ((s.getUTCDay() + 6) % 7));
        return { from: s, to: null };
      }
      case 'last_week': {
        const s = new Date(todayStart); s.setUTCDate(s.getUTCDate() - ((s.getUTCDay() + 6) % 7));
        const lastStart = new Date(s); lastStart.setUTCDate(lastStart.getUTCDate() - 7);
        return { from: lastStart, to: s };
      }
      case 'this_month':
        return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), to: null };
      case 'last_month': {
        const lastStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const thisStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        return { from: lastStart, to: thisStart };
      }
      case 'this_year':
        return { from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), to: null };
      case 'last_year': {
        const lastStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
        const thisStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
        return { from: lastStart, to: thisStart };
      }
      default:
        return { from: null, to: null };
    }
  }

  // ─── US-27: GET /v1/payouts — paginated history list ──────────
  async listPayouts(
    contractorId: string, page: number, pageSize: number, status?: string, search?: string,
    dateRange?: string, depositMethodId?: string, fromIso?: string, toIso?: string,
  ) {
    const clampedSize = Math.min(Math.max(pageSize, 1), 50);
    const clampedPage = Math.max(page, 1);

    const qb = this.payoutRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.depositMethod', 'dm')
      .where('p.contractorId = :contractorId', { contractorId });

    // SCR-16: status filter — only accept real enum values, silently ignore
    // anything else rather than erroring on an unrecognised query param.
    if (status && Object.values(PayoutStatus).includes(status as PayoutStatus)) {
      qb.andWhere('p.status = :status', { status });
    }

    const { from, to } = this.resolvePayoutDateRange(dateRange, fromIso, toIso);
    if (from) qb.andWhere('p.createdAt >= :from', { from });
    if (to) qb.andWhere('p.createdAt < :to', { to });

    // Figma "All Accounts" filter — restrict to a single deposit method.
    if (depositMethodId) qb.andWhere('p.depositMethodId = :depositMethodId', { depositMethodId });

    // Figma "Find transactions" search on the Payouts tab — matches against
    // the external account label (e.g. "Chase Bank"), same field toHistoryItem
    // exposes as methodLabel.
    if (search && search.trim().length >= 2) {
      qb.andWhere('(LOWER(dm.displayLabel) LIKE :term OR LOWER(dm.nickname) LIKE :term)',
        { term: `%${search.trim().toLowerCase()}%` });
    }

    const [rows, totalCount] = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((clampedPage - 1) * clampedSize)
      .take(clampedSize)
      .getManyAndCount();

    return {
      payouts: rows.map(r => this.toHistoryItem(r)),
      page: clampedPage,
      pageSize: clampedSize,
      totalCount,
      hasMore: clampedPage * clampedSize < totalCount,
    };
  }

  // ─── Export — reuses the exact same filters as listPayouts, just
  // unpaginated and capped, so the export can never disagree with what the
  // Payouts table shows for the same filter selection. ──────────────────
  private static readonly EXPORT_ROW_LIMIT = 10000;

  async exportPayouts(
    contractorId: string, format: 'csv' | 'pdf', status?: string, search?: string,
    dateRange?: string, depositMethodId?: string, contractorName?: string,
    fromIso?: string, toIso?: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const qb = this.payoutRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.depositMethod', 'dm')
      .where('p.contractorId = :contractorId', { contractorId });

    if (status && Object.values(PayoutStatus).includes(status as PayoutStatus)) {
      qb.andWhere('p.status = :status', { status });
    }
    const { from, to } = this.resolvePayoutDateRange(dateRange, fromIso, toIso);
    if (from) qb.andWhere('p.createdAt >= :from', { from });
    if (to) qb.andWhere('p.createdAt < :to', { to });
    if (depositMethodId) qb.andWhere('p.depositMethodId = :depositMethodId', { depositMethodId });
    if (search && search.trim().length >= 2) {
      qb.andWhere('(LOWER(dm.displayLabel) LIKE :term OR LOWER(dm.nickname) LIKE :term)',
        { term: `%${search.trim().toLowerCase()}%` });
    }

    const rows = await qb.orderBy('p.createdAt', 'DESC')
      .take(PayoutService.EXPORT_ROW_LIMIT)
      .getMany();

    const exportRows = rows.map(r => this.toHistoryItem(r));
    const exportedAt = new Date();
    const filename = `payouts-${exportedAt.toISOString().slice(0, 10)}.${format}`;

    let buffer: Buffer;
    if (format === 'pdf') {
      const { buildPayoutPdf } = await import('../export/pdf.builder');
      buffer = await buildPayoutPdf({ rows: exportRows, contractorName, exportedAt });
    } else {
      const { buildPayoutCsv } = await import('../export/csv.builder');
      buffer = buildPayoutCsv({ rows: exportRows, contractorName, exportedAt });
    }
    return { buffer, filename, contentType: format === 'pdf' ? 'application/pdf' : 'text/csv' };
  }

  // ─── US-28: GET /v1/payouts/:id — full detail ──────────────────
  async getPayoutDetail(contractorId: string, payoutRequestId: string) {
    const request = await this.payoutRepo.findOne({
      where: { id: payoutRequestId, contractorId },
      relations: ['depositMethod'],
    });
    if (!request) throw new PayoutError('Payout request not found.',
      HttpStatus.NOT_FOUND, 'ERR_PAYOUT_NOT_FOUND');

    return {
      ...this.toHistoryItem(request),
      idempotencyKey: request.idempotencyKey,
      providerReference: request.providerReference,
      retryCount: request.retryCount,
      // AC-28.04: field is present-but-empty until the provider callback arrives —
      // never omitted, per Doc 07 "never fabricate data" (no synthetic placeholder value).
      timeline: {
        initiatedAt: request.createdAt.toISOString(),
        verifiedAt: request.verifiedAt?.toISOString() ?? null,
        queuedAt: request.queuedAt?.toISOString() ?? null,
        processingAt: request.processingAt?.toISOString() ?? null,
        completedAt: request.completedAt?.toISOString() ?? null,
        failedAt: request.failedAt?.toISOString() ?? null,
        cancelledAt: request.cancelledAt?.toISOString() ?? null,
      },
    };
  }

  // Rail-typical settlement windows, in business days, used only to project
  // an "Est. Arrival" for payouts still in flight — never shown once a payout
  // reaches a terminal state (completed/failed/cancelled use their real timestamp
  // or nothing, per AC-28.04's "never fabricate data" rule).
  private static readonly ARRIVAL_BUSINESS_DAYS: Partial<Record<MethodType, number>> = {
    [MethodType.CRYPTO]: 0,
    [MethodType.TEQ_COIN]: 0,
    [MethodType.MARKETEQ_DEBIT_CARD]: 1,
    [MethodType.BANK_STRIPE]: 2,
    [MethodType.WISE]: 2,
    [MethodType.BANK_MANUAL]: 3,
  };

  private addBusinessDays(from: Date, days: number): Date {
    const d = new Date(from);
    let remaining = days;
    while (remaining > 0) {
      d.setUTCDate(d.getUTCDate() + 1);
      const dow = d.getUTCDay();
      if (dow !== 0 && dow !== 6) remaining--;
    }
    return d;
  }

  private estimateArrival(r: PayoutRequest): string | null {
    const TERMINAL = new Set([PayoutStatus.COMPLETED, PayoutStatus.FAILED, PayoutStatus.CANCELLED]);
    if (TERMINAL.has(r.status)) return null;
    const methodType = r.depositMethod?.methodType;
    if (!methodType) return null;
    const from = r.processingAt ?? r.queuedAt ?? r.createdAt;

    // Stripe's real Instant Payouts method (bank-payout-executor.service.ts)
    // is the only rail this system actually requests as instant from the
    // provider — matches the "15 minutes" promised at checkout. Every other
    // method's executor has no instant code path regardless of what speed
    // was selected, so estimating 15 minutes there would just repeat the
    // exact mismatch this fixes: fee charged, no real speed change.
    if (r.speed === PayoutSpeed.INSTANT && methodType === MethodType.BANK_STRIPE) {
      const arrival = new Date(from);
      arrival.setUTCMinutes(arrival.getUTCMinutes() + 30);
      return arrival.toISOString();
    }

    const days = PayoutService.ARRIVAL_BUSINESS_DAYS[methodType] ?? 3;
    return this.addBusinessDays(from, days).toISOString();
  }

  private toHistoryItem(r: PayoutRequest) {
    return {
      id: r.id,
      // amount_usd/fee_usd/net_amount_usd are numeric(18,8) columns — pg
      // returns them as full-precision strings (e.g. "650.00000000"). Every
      // other money value shown to the contractor is rounded to 2dp
      // (validateAmount/initiate already do this); this read path was the
      // one place that didn't.
      amountUsd: parseFloat(r.amountUsd).toFixed(2),
      feeUsd: parseFloat(r.feeUsd).toFixed(2),
      netAmountUsd: parseFloat(r.netAmountUsd).toFixed(2),
      currency: r.currency,
      status: r.status,
      trigger: r.trigger,
      failureReason: r.failureReason,
      methodType: r.depositMethod?.methodType ?? null,
      methodLabel: r.depositMethod?.displayLabel ?? r.depositMethod?.nickname ?? null,
      createdAt: r.createdAt.toISOString(),
      settledAt: r.completedAt?.toISOString() ?? null,
      estimatedArrivalAt: this.estimateArrival(r),
    };
  }

  // ─── Response Mappers ─────────────────────────────────────────
  private toInitiateResponse(request: PayoutRequest): InitiatePayoutResponseDto {
    return {
      payoutRequestId: request.id,
      status: request.status,
      amountUsd: parseFloat(request.amountUsd).toFixed(2),
      feeUsd: parseFloat(request.feeUsd).toFixed(2),
      netAmountUsd: parseFloat(request.netAmountUsd).toFixed(2),
      magicLinkSentTo: '',
      magicLinkExpiresAt: '',
      message: 'A verification link has been sent to your email.',
    };
  }

  private toInitiateResponseFull(request: PayoutRequest, expiresAt: Date, contractorEmail?: string): InitiatePayoutResponseDto {
    return {
      payoutRequestId: request.id,
      status: request.status,
      amountUsd: parseFloat(request.amountUsd).toFixed(2),
      feeUsd: parseFloat(request.feeUsd).toFixed(2),
      netAmountUsd: parseFloat(request.netAmountUsd).toFixed(2),
      // Was masking contractorId (a UUID, never contains "@") instead of the
      // contractor's actual email — always rendered as the maskEmail()
      // fallback "***" on the "Check your email" screen. The real address is
      // already on the JWT (decoded in JwtAuthGuard as req.user.email), no
      // extra service call needed — just wasn't threaded through here.
      magicLinkSentTo: this.maskEmail(contractorEmail ?? ''),
      magicLinkExpiresAt: expiresAt.toISOString(),
      message: 'A verification link has been sent to your email. Please click the link to confirm your withdrawal.',
    };
  }

  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return 'your email';
    const [local, domain] = email.split('@');
    return `${local[0]}***@${domain}`;
  }

  // Figma "Your withdrawal was declined — reserve balance is too low": an
  // ad-hoc withdrawal previously had no reserve awareness at all (reserveUsd
  // on payout_schedules only applied to the scheduled-payout engine's own
  // reserve deduction in schedule-execution.cron.ts's processSchedule()).
  // A contractor could
  // withdraw their entire available balance manually, silently defeating the
  // reserve they configured. This enforces the same floor for ad-hoc
  // withdrawals, with an explicit, one-time bypass (ignoreReserve) rather
  // than a hard, unrecoverable block — matches the Figma copy ("You can
  // either ignore the reserve balance for this transfer, or edit the
  // reserve amount in your payout settings").
  private async checkReserveBalance(
    contractorId: string, amount: number, availableBalance: number, ignoreReserve?: boolean,
  ): Promise<void> {
    if (ignoreReserve) return;
    const schedule = await this.scheduleRepo.findOne({ where: { contractorId } });
    const reserve = schedule ? parseFloat(schedule.reserveUsd) : 0;
    if (reserve <= 0) return;
    if (availableBalance - reserve < amount) {
      throw new PayoutError(
        'Your reserve balance is too low for this withdrawal.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_RESERVE_BALANCE_TOO_LOW',
        { reserveUsd: reserve.toFixed(2), availableBalanceUsd: availableBalance.toFixed(2) },
      );
    }
  }
}

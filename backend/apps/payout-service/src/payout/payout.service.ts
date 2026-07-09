// apps/payout-service/src/payout/payout.service.ts
// PS-02 + PS-14 + PS-19: Payout service with rate limiting, dedup, execution re-checks
import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService }       from '@nestjs/config';
import { InjectQueue }         from '@nestjs/bull';
import { Queue }               from 'bull';
import { createHash, randomUUID } from 'crypto';

import { PayoutRequest, PayoutStatus, PayoutTrigger } from '../entities/payout-request.entity';
import { DepositMethod, VerificationStatus, MethodType } from '../entities/deposit-method.entity';
import { MagicLinkToken }     from '../entities/magic-link-token.entity';
import { EarningsClient }     from '../common/earnings.client';
import { KycClient }          from '../common/kyc.client';
import { AuditService }       from '../audit/audit.service';
import { MagicLinkService }   from '../magic-link/magic-link.service';
import { WithdrawalRateLimitService } from './withdrawal-rate-limit.service';
import { PayoutError }        from '../common/errors/payout.error';
import { ValidateAmountDto, ValidateAmountResponseDto } from './dto/validate-amount.dto';
import { InitiatePayoutDto, InitiatePayoutResponseDto } from './dto/initiate-payout.dto';
import { VerifyResponseDto }  from './dto/verify-response.dto';

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
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly earningsClient: EarningsClient,
    private readonly kycClient: KycClient,
    private readonly auditService: AuditService,
    private readonly magicLinkService: MagicLinkService,
    private readonly rateLimitService: WithdrawalRateLimitService,
    @InjectQueue('payout-processing') private readonly queue: Queue,
  ) {
    this.payoutMinimum = parseFloat(this.config.get('PAYOUT_MINIMUM_USD', '50'));
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
      throw new PayoutError('Your available balance is insufficient for this withdrawal.',
        HttpStatus.BAD_REQUEST, 'ERR_INSUFFICIENT_BALANCE');
    }

    const instantFee = parseFloat(INSTANT_FEE);
    const standardNet = amount;
    const instantNet = amount - instantFee;

    if (dto.speed === 'instant' && instantNet <= 0) {
      throw new PayoutError('The instant withdrawal fee exceeds the requested amount.',
        HttpStatus.BAD_REQUEST, 'ERR_PAYOUT_FEE_EXCEEDS_AMOUNT');
    }

    const fee = dto.speed === 'instant' ? instantFee : 0;
    const net = amount - fee;

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
  async initiate(contractorId: string, dto: InitiatePayoutDto): Promise<InitiatePayoutResponseDto> {
    // PS-19 §3.1: Idempotency check
    const existing = await this.payoutRepo.findOne({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existing) return { ...this.toInitiateResponse(existing), replayed: true };

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
      throw new PayoutError('Your available balance is insufficient for this withdrawal.',
        HttpStatus.BAD_REQUEST, 'ERR_INSUFFICIENT_BALANCE');
    }

    // PS-19 §3.4: KYC check at initiation
    const kyc = await this.kycClient.getStatus(contractorId);
    if (kyc.firstPayoutHold) {
      throw new PayoutError(
        'Your first payout is on hold. This is a standard verification step.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_PAYOUT_FIRST_HOLD');
    }
    if (kyc.suspended) {
      throw new PayoutError('Your account is suspended.',
        HttpStatus.FORBIDDEN, 'ERR_PAYOUT_ACCOUNT_SUSPENDED');
    }

    // Validate deposit method
    const method = await this.methodRepo.findOne({
      where: { id: dto.depositMethodId, contractorId, isActive: true },
    });
    if (!method) throw new PayoutError('Deposit method not found.',
      HttpStatus.NOT_FOUND, 'ERR_PAYOUT_METHOD_NOT_FOUND');
    if (method.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new PayoutError('This deposit method has not been verified yet.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_PAYOUT_METHOD_UNVERIFIED');
    }
    if (method.methodType === MethodType.TEQ_COIN && !this.config.get('FEATURE_TEQ_COIN_ENABLED', false)) {
      throw new PayoutError('This payout method is not currently available.',
        HttpStatus.BAD_REQUEST, 'ERR_PAYOUT_METHOD_UNAVAILABLE');
    }

    // Calculate fee
    const feeUsd = dto.speed === 'instant' ? INSTANT_FEE : '0.00';
    const netAmountUsd = (parseFloat(dto.amountUsd) - parseFloat(feeUsd)).toFixed(8);
    if (parseFloat(netAmountUsd) <= 0) {
      throw new PayoutError('The instant withdrawal fee exceeds the requested amount.',
        HttpStatus.BAD_REQUEST, 'ERR_PAYOUT_FEE_EXCEEDS_AMOUNT');
    }

    // Create payout_request + magic_link_token in transaction
    const result = await this.dataSource.transaction(async (em) => {
      const rawToken = randomUUID();
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + this.magicLinkService.getTtlMs());

      const mlToken = em.create(MagicLinkToken, {
        contractorId, tokenHash, expiresAt,
        payoutAmountUsd: dto.amountUsd,
        depositMethodId: dto.depositMethodId,
      });
      await em.save(mlToken);

      const request = em.create(PayoutRequest, {
        contractorId, idempotencyKey: dto.idempotencyKey,
        trigger: PayoutTrigger.MANUAL,
        status: PayoutStatus.PENDING_VERIFICATION,
        amountUsd: dto.amountUsd, feeUsd, netAmountUsd,
        currency: 'USD',
      });
      (request as any).depositMethodId = dto.depositMethodId;
      (request as any).magicLinkTokenId = mlToken.id;
      await em.save(request);

      await this.auditService.log({
        contractorId, payoutRequestId: request.id,
        actorType: 'contractor', actorId: contractorId,
        action: 'withdrawal.initiated',
        newStatus: PayoutStatus.PENDING_VERIFICATION,
      });

      this.magicLinkService.send(contractorId, rawToken, dto.amountUsd).catch(err =>
        this.logger.error('Magic link send failed', err.message),
      );

      return { request, mlToken, rawToken };
    });

    return this.toInitiateResponseFull(result.request, result.mlToken);
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
        await this.payoutRepo.update(payoutRequestId, {
          status: PayoutStatus.FAILED,
          failureReason: 'INSUFFICIENT_BALANCE_AT_EXECUTION',
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
    }

    return { status: 'cancelled' };
  }

  // ─── Response Mappers ─────────────────────────────────────────
  private toInitiateResponse(request: PayoutRequest): InitiatePayoutResponseDto {
    return {
      payoutRequestId: request.id,
      status: request.status,
      amountUsd: request.amountUsd,
      feeUsd: request.feeUsd,
      netAmountUsd: request.netAmountUsd,
      magicLinkSentTo: '',
      magicLinkExpiresAt: '',
      message: 'A verification link has been sent to your email.',
    };
  }

  private toInitiateResponseFull(request: PayoutRequest, mlToken: MagicLinkToken): InitiatePayoutResponseDto {
    return {
      payoutRequestId: request.id,
      status: request.status,
      amountUsd: request.amountUsd,
      feeUsd: request.feeUsd,
      netAmountUsd: request.netAmountUsd,
      magicLinkSentTo: this.maskEmail(request.contractorId),
      magicLinkExpiresAt: mlToken.expiresAt.toISOString(),
      message: 'A verification link has been sent to your email. Please click the link to confirm your withdrawal.',
    };
  }

  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    return `${local[0]}***@${domain}`;
  }
}

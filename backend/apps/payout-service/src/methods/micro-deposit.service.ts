import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Cron }                from '@nestjs/schedule';
import { DepositMethod, MethodType, VerificationStatus } from '../entities/deposit-method.entity';
import { DepositMethodVerification } from '../entities/deposit-method-verification.entity';
import { MagicLinkToken }     from '../entities/magic-link-token.entity';
import { AuditService }       from '../audit/audit.service';
import { PayoutError }        from '../common/errors/payout.error';

function generateMicroDepositAmounts(): { amount1Cents: number; amount2Cents: number } {
  const amount1 = Math.floor(Math.random() * 99) + 1;
  let amount2: number;
  do { amount2 = Math.floor(Math.random() * 99) + 1; } while (amount2 === amount1);
  return { amount1Cents: amount1, amount2Cents: amount2 };
}

@Injectable()
export class MicroDepositService {
  private readonly logger = new Logger(MicroDepositService.name);

  constructor(
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    @InjectRepository(DepositMethodVerification)
    private readonly verificationRepo: Repository<DepositMethodVerification>,
    @InjectRepository(MagicLinkToken)
    private readonly mlTokenRepo: Repository<MagicLinkToken>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  // ─── Initiate for BANK_MANUAL ─────────────────────────────────
  async initiateMicroDepositsManual(method: DepositMethod): Promise<void> {
    const { amount1Cents, amount2Cents } = generateMicroDepositAmounts();
    const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

    await this.verificationRepo.save({
      depositMethodId: method.id,
      contractorId: method.contractorId,
      verificationType: 'micro_deposit',
      amount1Cents, amount2Cents,
      maxAttempts: 3, attemptCount: 0,
      expiresAt,
      status: VerificationStatus.PENDING,
    } as any);

    // In production: send two ACH credits via Stripe
    // For dev: amounts are stored and contractor confirms manually
    this.logger.log(`Micro-deposits initiated for method ${method.id} (expires: ${expiresAt.toISOString()})`);
  }

  // ─── Initiate for BANK_STRIPE fallback ────────────────────────
  async initiateMicroDepositsStripe(method: DepositMethod, setupIntentId: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

    await this.verificationRepo.save({
      depositMethodId: method.id,
      contractorId: method.contractorId,
      verificationType: 'micro_deposit',
      oauthState: setupIntentId,
      amount1Cents: null, amount2Cents: null, // Stripe holds these
      maxAttempts: 3, attemptCount: 0,
      expiresAt,
      status: VerificationStatus.PENDING,
    } as any);

    this.logger.log(`Stripe micro-deposits initiated for method ${method.id}`);
  }

  // ─── Confirm micro-deposit amounts ────────────────────────────
  async confirmMicroDeposits(
    contractorId: string, methodId: string,
    dto: { amount1Cents: number; amount2Cents: number },
  ): Promise<{ verified: boolean; depositMethodId: string }> {

    // 1. Load verification
    const verification = await this.verificationRepo.findOne({
      where: { depositMethodId: methodId, contractorId } as any,
      order: { createdAt: 'DESC' },
    });
    if (!verification) throw new PayoutError('No pending verification found.',
      HttpStatus.NOT_FOUND, 'ERR_VERIFICATION_NOT_FOUND');

    // 2. Already verified — idempotent
    if (verification.status === VerificationStatus.VERIFIED)
      return { verified: true, depositMethodId: methodId };

    // 3. Lazy lock release
    if (verification.status === VerificationStatus.LOCKED as any) {
      if (verification.lockedUntil && verification.lockedUntil <= new Date()) {
        await this.verificationRepo.update(verification.id, {
          status: VerificationStatus.PENDING as any, lockedUntil: null,
        });
        await this.methodRepo.update(methodId, { verificationStatus: VerificationStatus.PENDING });
        verification.status = VerificationStatus.PENDING as any;
        verification.lockedUntil = null;
      } else {
        throw new PayoutError(
          `Too many failed attempts. You can try again after ${verification.lockedUntil?.toISOString()}.`,
          HttpStatus.TOO_MANY_REQUESTS, 'ERR_VERIFICATION_LOCKED',
          { lockedUntil: verification.lockedUntil });
      }
    }

    // 4. Expired check
    if (verification.expiresAt! < new Date()) {
      throw new PayoutError(
        'The verification window for this account has expired. Please remove this account and add it again.',
        HttpStatus.GONE, 'ERR_VERIFICATION_EXPIRED');
    }

    // 5. Validate amounts
    const method = await this.methodRepo.findOne({ where: { id: methodId } });

    if (method?.methodType === MethodType.BANK_STRIPE && verification.oauthState) {
      // Stripe path — delegate to Stripe (stubbed for dev)
      return this.confirmStripe(verification, dto);
    } else {
      // Manual path — order-independent comparison
      return this.confirmManual(verification, dto, methodId);
    }
  }

  // ─── Manual path — compare stored amounts ─────────────────────
  private async confirmManual(
    verification: DepositMethodVerification,
    dto: { amount1Cents: number; amount2Cents: number },
    methodId: string,
  ): Promise<{ verified: boolean; depositMethodId: string }> {
    const submitted = [dto.amount1Cents, dto.amount2Cents].sort((a, b) => a - b);
    const expected = [verification.amount1Cents!, verification.amount2Cents!].sort((a, b) => a - b);
    const matched = submitted[0] === expected[0] && submitted[1] === expected[1];

    if (matched) {
      await this.applySuccess(verification);
      return { verified: true, depositMethodId: methodId };
    } else {
      await this.applyFailure(verification);
      return { verified: false, depositMethodId: methodId }; // won't reach — applyFailure throws
    }
  }

  // ─── Stripe path — delegate validation ────────────────────────
  private async confirmStripe(
    verification: DepositMethodVerification,
    dto: { amount1Cents: number; amount2Cents: number },
  ): Promise<{ verified: boolean; depositMethodId: string }> {
    // In dev mode without Stripe: treat as manual with null amounts — auto-verify
    if (!verification.amount1Cents && !verification.amount2Cents) {
      await this.applySuccess(verification);
      return { verified: true, depositMethodId: verification.depositMethodId };
    }
    // Production: would call stripe.setupIntents.verifyMicrodeposits()
    await this.applyFailure(verification);
    return { verified: false, depositMethodId: verification.depositMethodId };
  }

  // ─── Apply success ────────────────────────────────────────────
  private async applySuccess(verification: DepositMethodVerification): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      await em.update(DepositMethodVerification, verification.id, {
        status: VerificationStatus.VERIFIED as any, verifiedAt: new Date(),
      });
      await em.update(DepositMethod, verification.depositMethodId, {
        verificationStatus: VerificationStatus.VERIFIED,
      });
    });
    await this.auditService.log({
      contractorId: verification.contractorId,
      actorType: 'contractor', actorId: verification.contractorId,
      action: 'method.verified',
      metadata: { depositMethodId: verification.depositMethodId, type: 'micro_deposit' },
    });
    this.logger.log(`Micro-deposit verified: method ${verification.depositMethodId}`);
  }

  // ─── Apply failure ────────────────────────────────────────────
  private async applyFailure(verification: DepositMethodVerification): Promise<void> {
    const newAttemptCount = (verification.attemptCount ?? 0) + 1;
    const isLastAttempt = newAttemptCount >= (verification.maxAttempts ?? 3);

    if (isLastAttempt) {
      const lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await this.dataSource.transaction(async (em) => {
        await em.update(DepositMethodVerification, verification.id, {
          attemptCount: newAttemptCount,
          status: VerificationStatus.LOCKED as any, lockedUntil,
        });
        await em.update(DepositMethod, verification.depositMethodId, {
          verificationStatus: VerificationStatus.LOCKED,
        });
      });
      throw new PayoutError(
        `Too many failed attempts. You can try again after ${lockedUntil.toISOString()}.`,
        HttpStatus.TOO_MANY_REQUESTS, 'ERR_VERIFICATION_LOCKED',
        { lockedUntil });
    }

    await this.verificationRepo.update(verification.id, { attemptCount: newAttemptCount });
    const attemptsLeft = (verification.maxAttempts ?? 3) - newAttemptCount;
    throw new PayoutError(
      `Incorrect amounts. ${attemptsLeft} attempt(s) remaining.`,
      HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_VERIFICATION_AMOUNTS_INCORRECT',
      { attemptsLeft });
  }

  // ─── Expiry Cleanup Cron — daily at 02:00 UTC ────────────────
  @Cron('0 2 * * *')
  async expireStaleVerifications(): Promise<void> {
    const now = new Date();
    const expired = await this.verificationRepo.find({
      where: [
        { status: VerificationStatus.PENDING as any, expiresAt: LessThan(now) },
        { status: VerificationStatus.LOCKED as any, expiresAt: LessThan(now) },
      ],
    });

    for (const v of expired) {
      await this.dataSource.transaction(async (em) => {
        await em.update(DepositMethodVerification, v.id, {
          status: VerificationStatus.EXPIRED as any,
        });
        await em.update(DepositMethod, v.depositMethodId, {
          verificationStatus: VerificationStatus.EXPIRED,
        });
      });
      this.logger.log(`Verification expired: method ${v.depositMethodId}`);
    }

    // Cleanup expired magic link tokens
    await this.mlTokenRepo.update(
      { isUsed: false, expiresAt: LessThan(now) } as any,
      { isUsed: true },
    );

    if (expired.length > 0) this.logger.log(`Expired ${expired.length} stale verifications`);
  }
}

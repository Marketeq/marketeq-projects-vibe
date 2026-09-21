import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Cron }                from '@nestjs/schedule';
import { DepositMethod, VerificationStatus } from '../entities/deposit-method.entity';
import { DepositMethodVerification } from '../entities/deposit-method-verification.entity';
import { MagicLinkToken }     from '../entities/magic-link-token.entity';
import { AuditService }       from '../audit/audit.service';
import { PayoutError }        from '../common/errors/payout.error';
import { StripeProvider }     from '../providers/stripe.provider';

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
    private readonly stripeProvider: StripeProvider,
  ) {}

  // ─── Dev: read micro-deposit amounts for auto-verify ──────────
  async getVerificationAmounts(contractorId: string, depositMethodId: string) {
    const v = await this.verificationRepo.findOne({
      where: { depositMethodId, contractorId, status: VerificationStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
    if (!v) return { amount1Cents: 0, amount2Cents: 0 };
    return { amount1Cents: v.amount1Cents, amount2Cents: v.amount2Cents };
  }

  // ─── Confirm micro-deposit amounts ────────────────────────────
  async confirmMicroDeposits(
    contractorId: string, methodId: string,
    dto: { amount1Cents: number; amount2Cents: number },
  ): Promise<{ verified: boolean; depositMethodId: string | null }> {

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
    // oauthState only ever holds a real Stripe SetupIntent id — set for
    // BANK_STRIPE (non-instant FC accounts) and for BANK_MANUAL/US accounts
    // once initiateManualMicroDeposits() sent real ACH credits (PS-08).
    // Everything else (non-US BANK_MANUAL, or Stripe unconfigured in dev)
    // never gets an oauthState and falls through to the local comparison.
    if (verification.oauthState) {
      return this.confirmStripe(verification, dto);
    } else {
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

  // ─── Stripe path — real setupIntents.verifyMicrodeposits() ────
  private async confirmStripe(
    verification: DepositMethodVerification,
    dto: { amount1Cents: number; amount2Cents: number },
  ): Promise<{ verified: boolean; depositMethodId: string | null }> {
    try {
      await this.stripeProvider.verifyMicrodepositAmounts(
        verification.oauthState!, dto.amount1Cents, dto.amount2Cents, verification.depositMethodId!,
      );
      await this.applySuccess(verification);
      return { verified: true, depositMethodId: verification.depositMethodId };
    } catch (err) {
      // Stripe's own documented 10/11 (SM33CC) and 40/41 (SM44DD) codes
      // simulate a specific terminal state directly on the first submission
      // — not a wrong-amount attempt that erodes the normal 3-strikes
      // counter — so these jump straight to LOCKED/EXPIRED.
      if (err instanceof PayoutError && err.errorCode === 'ERR_SIMULATED_TOO_MANY_ATTEMPTS') {
        await this.applyDirectLock(verification);
      }
      if (err instanceof PayoutError && err.errorCode === 'ERR_SIMULATED_TIMEOUT') {
        await this.applyDirectExpire(verification);
      }
      if (err instanceof PayoutError) throw err; // e.g. ERR_STRIPE_NOT_CONFIGURED
      await this.applyFailure(verification); // throws ERR_VERIFICATION_AMOUNTS_INCORRECT / LOCKED
      return { verified: false, depositMethodId: verification.depositMethodId }; // unreachable
    }
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

  // ─── Simulated SM33CC (10/11) — jump straight to LOCKED ───────
  // Unlike applyFailure's 3-strikes lockout, Stripe's documented "exceeding
  // verification attempts" code simulates the locked outcome directly on
  // whichever attempt submits it — it isn't itself a failed attempt to count.
  private async applyDirectLock(verification: DepositMethodVerification): Promise<never> {
    const lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.dataSource.transaction(async (em) => {
      await em.update(DepositMethodVerification, verification.id, {
        status: VerificationStatus.LOCKED as any, lockedUntil,
      });
      await em.update(DepositMethod, verification.depositMethodId, {
        verificationStatus: VerificationStatus.LOCKED,
      });
    });
    await this.auditService.log({
      contractorId: verification.contractorId,
      actorType: 'contractor', actorId: verification.contractorId,
      action: 'method.verification.locked',
      metadata: { depositMethodId: verification.depositMethodId, reason: 'stripe_test_code_SM33CC' },
    });
    throw new PayoutError(
      `Too many failed attempts. You can try again after ${lockedUntil.toISOString()}.`,
      HttpStatus.TOO_MANY_REQUESTS, 'ERR_VERIFICATION_LOCKED',
      { lockedUntil });
  }

  // ─── Simulated SM44DD (40/41) — jump straight to EXPIRED ──────
  private async applyDirectExpire(verification: DepositMethodVerification): Promise<never> {
    await this.dataSource.transaction(async (em) => {
      await em.update(DepositMethodVerification, verification.id, {
        status: VerificationStatus.EXPIRED as any,
      });
      await em.update(DepositMethod, verification.depositMethodId, {
        verificationStatus: VerificationStatus.EXPIRED,
      });
    });
    await this.auditService.log({
      contractorId: verification.contractorId,
      actorType: 'contractor', actorId: verification.contractorId,
      action: 'method.verification.expired',
      metadata: { depositMethodId: verification.depositMethodId, reason: 'stripe_test_code_SM44DD' },
    });
    throw new PayoutError(
      'The verification window for this account has expired. Please remove this account and add it again.',
      HttpStatus.GONE, 'ERR_VERIFICATION_EXPIRED');
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

    // A null deposit_method_id is a normal, expected state here, not corrupt
    // data: migration 002 drops NOT NULL precisely because Stripe Financial
    // Connections creates the verification row before the deposit_method row
    // exists (the session is created before OAuth completes, PS-05). Any FC
    // session the contractor abandons therefore reaches this sweep with a null
    // method — so this path is guaranteed to be hit, not a rare edge case.
    //
    // Passing that null straight to em.update() made TypeORM throw "Empty
    // criteria(s) are not allowed for the update method", and because nothing
    // caught it the throw escaped the whole cron: every later row went
    // unexpired and the magic-link cleanup below never ran at all. Expiring
    // the verification and skipping the method update is the correct handling
    // for an abandoned session — there is no method row to mark yet.
    let succeeded = 0;
    const failed: string[] = [];

    for (const v of expired) {
      try {
        await this.dataSource.transaction(async (em) => {
          await em.update(DepositMethodVerification, v.id, {
            status: VerificationStatus.EXPIRED as any,
          });
          if (v.depositMethodId) {
            await em.update(DepositMethod, v.depositMethodId, {
              verificationStatus: VerificationStatus.EXPIRED,
            });
          }
        });
        succeeded++;
        if (v.depositMethodId) {
          this.logger.log(`Verification expired: method ${v.depositMethodId}`);
        } else {
          // Routine, so logged at the same level as the normal case: an
          // abandoned Stripe FC session has no method row to mark yet.
          this.logger.log(
            `Verification ${v.id} expired with no deposit_method_id ` +
            `(unconsummated session) — nothing to update on the method`,
          );
        }
      } catch (err: unknown) {
        failed.push(v.id);
        this.logger.error(
          `Failed to expire verification ${v.id} ` +
          `(method ${v.depositMethodId ?? 'none'}): ` +
          `${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Cleanup expired magic link tokens. Kept outside the loop's failure path
    // so a bad verification row can no longer suppress it.
    try {
      await this.mlTokenRepo.update(
        { isUsed: false, expiresAt: LessThan(now) } as any,
        { isUsed: true },
      );
    } catch (err: unknown) {
      this.logger.error(
        `Magic link token cleanup failed: ` +
        `${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (succeeded > 0) this.logger.log(`Expired ${succeeded} stale verifications`);
    if (failed.length > 0) {
      this.logger.error(
        `${failed.length} verification(s) could not be expired: ${failed.join(', ')}`,
      );
    }
  }
}

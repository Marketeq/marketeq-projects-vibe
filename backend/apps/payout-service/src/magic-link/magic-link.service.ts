// apps/payout-service/src/magic-link/magic-link.service.ts
// PS-14: Magic Link Email Verification
// Token generation (SHA-256 hash-only storage), Redis-backed validation,
// resend with rate limit, RabbitMQ event for notification-service delivery.
// CRITICAL: Raw token is NEVER stored, logged, or persisted anywhere.

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { Cron } from '@nestjs/schedule';

import { MagicLinkVerification } from '../entities/magic-link-verification.entity';
import { PayoutRequest, PayoutStatus } from '../entities/payout-request.entity';
import { DepositMethod } from '../entities/deposit-method.entity';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';
import { PayoutError } from '../common/errors/payout.error';
import { BrevoMailService } from '../notifications/brevo-mail.service';
import { EarningsClient } from '../common/earnings.client';

const TTL_SECONDS = 15 * 60; // 15 minutes — hard, no extension
const MAX_RESENDS = 3;
const RESEND_COOLDOWN_SECONDS = 30;

@Injectable()
export class MagicLinkService {
  private readonly logger = new Logger(MagicLinkService.name);
  private readonly redis: Redis;
  private readonly baseUrl: string;
  private readonly ttlSeconds: number;
  private readonly isProduction: boolean;

  constructor(
    @InjectRepository(MagicLinkVerification)
    private readonly verificationRepo: Repository<MagicLinkVerification>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
    private readonly brevoMail: BrevoMailService,
    private readonly earningsClient: EarningsClient,
  ) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'));
    this.baseUrl = this.config.get('MAGIC_LINK_BASE_URL', 'http://localhost:3000/verify-withdrawal');
    this.ttlSeconds = parseInt(this.config.get('MAGIC_LINK_TTL_SECONDS', '900'), 10);
    this.isProduction = this.config.get('NODE_ENV', 'development') === 'production';
  }

  // One shared backend serves three different frontend origins at once
  // (DEVOPS_SOP.md §3 — Vercel dev/staging/live all point at the same
  // marketeq-backend.onrender.com), so a single static MAGIC_LINK_BASE_URL
  // can only ever be right for one of them. Mirrors
  // AuthService.resolveTrustedPasswordResetBase() exactly, same reasoning:
  // the frontend that started the withdrawal tells us its own base URL
  // (dto.redirectUrl) rather than us guessing from a header, and we only
  // ever use it if its origin is on the FRONTEND_URL trusted list — never
  // reflect an arbitrary client-supplied URL straight into the email, which
  // would otherwise let it point the "confirm withdrawal" link anywhere.
  // FRONTEND_URL is comma-separated (same convention as auth-service) since
  // the one shared backend must trust all three frontend origins at once.
  private resolveTrustedMagicLinkBase(requestedBase?: string): string {
    if (!requestedBase) return this.baseUrl;

    const trustedOrigins = (this.config.get<string>('FRONTEND_URL') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((value) => {
        try { return new URL(value).origin; } catch { return undefined; }
      })
      .filter((value): value is string => !!value);

    try {
      const requestedUrl = new URL(requestedBase);
      if (trustedOrigins.includes(requestedUrl.origin)) return requestedBase;
    } catch {
      // fall back to configured default below
    }
    return this.baseUrl;
  }

  // The raw token is a bearer credential: it is the single factor that moves
  // a payout from PENDING_VERIFICATION to QUEUED. Logging the full URL is a
  // local-debugging affordance only — see the CRITICAL note at the top of
  // this file. Both deployed environments set NODE_ENV=production (see
  // backend/.env.staging.example and .env.production.example), so this can
  // never emit a live token into staging or live logs.
  private logDevVerifyUrl(magicLinkUrl: string): void {
    if (this.isProduction) return;
    this.logger.warn(`[DEV MODE] Full verify URL: ${magicLinkUrl}`);
  }

  /**
   * Returns TTL in milliseconds (used by payout.service.ts initiate)
   */
  getTtlMs(): number {
    return this.ttlSeconds * 1000;
  }

  // ─── PS-14 §3: Generate Token + Store Hash in Redis + DB ───
  async generateAndStore(
    payoutRequestId: string,
    contractorId: string,
  ): Promise<string> {
    // 1. Generate cryptographically random 32-byte token (256 bits)
    const rawToken = crypto.randomBytes(32).toString('hex'); // 64-char hex

    // 2. Hash with SHA-256 — ONLY the hash is stored
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);

    // 3. Store hash in Redis with TTL
    await this.redis.set(
      `magiclink:${tokenHash}`,
      JSON.stringify({
        payoutRequestId,
        contractorId,
        used: false,
        expiresAt: expiresAt.toISOString(),
      }),
      'EX', this.ttlSeconds,
    );

    // 4. Persist verification record in DB for audit trail (hash only)
    await this.verificationRepo.save({
      payoutRequestId,
      contractorId,
      tokenHash,
      expiresAt,
      used: false,
    });

    // Raw token returned to caller — used ONLY to build the email link URL
    // It must NOT be logged, stored, or passed beyond the email composition step
    return rawToken;
  }

  // ─── PS-14 §4: Send magic link email via Brevo ──
  // Per 00 — Payouts Epic Overview §9.3, payout-service calls its email
  // provider directly for magic links (unlike every other contractor
  // communication, which goes through notification-service via RabbitMQ).
  async publishMagicLinkEvent(
    payout: PayoutRequest,
    rawToken: string,
    contractorEmail?: string,
    redirectUrl?: string,
  ): Promise<void> {
    const baseUrl = this.resolveTrustedMagicLinkBase(redirectUrl);
    const magicLinkUrl = `${baseUrl}?token=${rawToken}&id=${payout.id}`;

    this.logger.log(`[MAGIC_LINK] Email event for payout ${payout.id} (contractor: ${payout.contractorId})`);
    // CRITICAL: Do NOT log the raw token or full URL
    this.logger.log(`[DEV] Verify URL: ${baseUrl}?token=***REDACTED***&id=${payout.id}`);

    if (!contractorEmail) {
      this.logger.warn(`No contractor email available for payout ${payout.id} — magic link cannot be emailed.`);
      this.logDevVerifyUrl(magicLinkUrl);
      return;
    }

    try {
      await this.brevoMail.sendMagicLink(contractorEmail, magicLinkUrl, parseFloat(payout.amountUsd).toFixed(2));
    } catch (err) {
      // PS-14 / F-18: delivery failure must not block withdrawal initiation —
      // the payout_request already exists; the contractor can use resend (F-19).
      this.logger.error(`Magic link email delivery failed for payout ${payout.id}: ${(err as Error).message}`);
      this.logDevVerifyUrl(magicLinkUrl);
    }
  }

  // ─── PS-14 §5: Verify Magic Link Token ──────────────────────
  async verifyEmailToken(
    rawToken: string,
    payoutRequestId: string,
  ): Promise<{
    payoutRequestId: string; status: string; message: string;
    amountUsd?: string; netAmountUsd?: string; feeUsd?: string; currency?: string;
    methodType?: string; methodLabel?: string | null;
  }> {
    // 1. Hash incoming token — never compare raw values
    const incomingHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 2. Look up hash in Redis
    const raw = await this.redis.get(`magiclink:${incomingHash}`);

    // 3. Redis key missing = expired or never existed
    if (!raw) {
      const dbRecord = await this.verificationRepo.findOne({
        where: { tokenHash: incomingHash },
      });

      if (dbRecord?.used) {
        throw new PayoutError(
          'This verification link has already been used.',
          HttpStatus.GONE, 'ERR_MAGIC_LINK_ALREADY_USED',
        );
      }

      throw new PayoutError(
        'This verification link has expired. Please start your withdrawal again.',
        HttpStatus.GONE, 'ERR_MAGIC_LINK_EXPIRED',
      );
    }

    const session = JSON.parse(raw);

    // 4. Validate payoutRequestId matches — prevents token substitution
    if (session.payoutRequestId !== payoutRequestId) {
      throw new PayoutError(
        'Invalid verification link.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_MAGIC_LINK_INVALID',
      );
    }

    // 5. Consume token atomically — delete from Redis first
    const deleted = await this.redis.del(`magiclink:${incomingHash}`);
    if (deleted === 0) {
      throw new PayoutError(
        'This verification link has already been used.',
        HttpStatus.GONE, 'ERR_MAGIC_LINK_ALREADY_USED',
      );
    }

    // 6. Mark as used in DB audit record
    await this.verificationRepo.update(
      { tokenHash: incomingHash },
      { used: true, usedAt: new Date() },
    );

    // 7. Advance payout request to QUEUED (matching existing PS-02 flow)
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutRequestId },
      relations: ['depositMethod'],
    });

    if (!payout) {
      throw new PayoutError('Payout request not found.', HttpStatus.NOT_FOUND, 'ERR_PAYOUT_NOT_FOUND');
    }

    // AC-20.01: the success screen needs amount/method regardless of branch below,
    // so build this once and reuse it for both the idempotent-replay and fresh-verify returns.
    const detail = {
      // amount_usd/net_amount_usd are numeric(18,8) — round to 2dp for display.
      amountUsd: parseFloat(payout.amountUsd).toFixed(2),
      netAmountUsd: parseFloat(payout.netAmountUsd).toFixed(2),
      // speed itself isn't persisted (only used transiently to compute feeUsd
      // at initiate() time) — feeUsd > 0 implies instant, matching that same
      // derivation, so this is accurate rather than a guess.
      feeUsd: parseFloat(payout.feeUsd).toFixed(2),
      currency: payout.currency,
      methodType: payout.depositMethod?.methodType,
      methodLabel: payout.depositMethod?.displayLabel ?? payout.depositMethod?.nickname ?? null,
    };

    if (payout.status !== PayoutStatus.PENDING_VERIFICATION) {
      // Payout already advanced or cancelled — idempotent
      return { payoutRequestId, status: 'already_processed', message: 'This withdrawal has already been processed.', ...detail };
    }

    // Instant hold: debit available_balance the moment the withdrawal is
    // confirmed, rather than waiting for the provider's completion webhook
    // (which can take minutes to days). This is the real magic-link path
    // (the one the actual email link hits — see PayoutController.verifyEmail);
    // PayoutService.verifyMagicLink() is a separate, older code path guarded
    // by the same hold.
    const held = await this.earningsClient.holdBalance(payout.contractorId, payout.amountUsd);
    if (!held) {
      await this.dataSource.transaction(async (em) => {
        await em.update(PayoutRequest, payoutRequestId, {
          status: PayoutStatus.FAILED,
          failureReason: 'Your available balance is insufficient for this withdrawal.',
          failedAt: new Date(),
        });
        await this.auditService.log({
          contractorId: payout.contractorId,
          payoutRequestId,
          actorType: 'contractor',
          actorId: payout.contractorId,
          action: 'withdrawal.hold_failed',
          previousStatus: PayoutStatus.PENDING_VERIFICATION,
          newStatus: PayoutStatus.FAILED,
        });
      });
      return {
        payoutRequestId,
        status: 'failed',
        message: 'Your available balance is insufficient for this withdrawal.',
        ...detail,
      };
    }

    await this.dataSource.transaction(async (em) => {
      await em.update(PayoutRequest, payoutRequestId, {
        status: PayoutStatus.QUEUED,
        verifiedAt: new Date(),
        queuedAt: new Date(),
      });

      await this.auditService.log({
        contractorId: payout.contractorId,
        payoutRequestId,
        actorType: 'contractor',
        actorId: payout.contractorId,
        action: 'magic_link.verified',
        previousStatus: PayoutStatus.PENDING_VERIFICATION,
        newStatus: PayoutStatus.QUEUED,
      });
    });

    return {
      payoutRequestId,
      status: 'verified',
      message: 'Your withdrawal has been confirmed and is being processed.',
      ...detail,
    };
  }

  // ─── PS-14 §7: Resend Verification ─────────────────────────
  async resendVerification(
    contractorId: string,
    payoutRequestId: string,
    contractorEmail?: string,
    redirectUrl?: string,
  ): Promise<{ resent: boolean; message: string }> {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutRequestId, contractorId, status: PayoutStatus.PENDING_VERIFICATION },
    });

    if (!payout) {
      throw new PayoutError(
        'Payout not found or no longer awaiting verification.',
        HttpStatus.NOT_FOUND, 'ERR_PAYOUT_NOT_FOUND',
      );
    }

    // Rate limit: max 3 resends per payoutRequestId
    const resendCount = await this.verificationRepo.count({
      where: { payoutRequestId, superseded: false },
    });

    if (resendCount >= MAX_RESENDS) {
      throw new PayoutError(
        'Maximum verification resends reached. Please start a new withdrawal.',
        HttpStatus.TOO_MANY_REQUESTS, 'ERR_MAGIC_LINK_RESEND_LIMIT',
      );
    }

    // Invalidate previous token
    const previous = await this.verificationRepo.findOne({
      where: { payoutRequestId, used: false, superseded: false },
      order: { createdAt: 'DESC' },
    });

    // ERR-52: server-defined resend cooldown — must not be reconstructible
    // client-side, so the remaining seconds are returned in the error body.
    if (previous) {
      const elapsedSeconds = (Date.now() - previous.createdAt.getTime()) / 1000;
      const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds);
      if (remaining > 0) {
        throw new PayoutError(
          'Please wait before requesting another link.',
          HttpStatus.TOO_MANY_REQUESTS, 'ERR_MAGIC_LINK_RESEND_COOLDOWN',
          { cooldownRemainingSeconds: remaining },
        );
      }
    }

    if (previous) {
      await this.redis.del(`magiclink:${previous.tokenHash}`);
      await this.verificationRepo.update({ id: previous.id }, { superseded: true });
    }

    // Generate and publish new token
    const rawToken = await this.generateAndStore(payoutRequestId, contractorId);
    await this.publishMagicLinkEvent(payout, rawToken, contractorEmail, redirectUrl);

    return { resent: true, message: 'A new verification email has been sent.' };
  }

  // ─── PS-14 §10: Cancel Expired Payout Requests (every 5 min) ──
  // Reviewer-caught bug: this used to key off payout.createdAt, which is
  // only a correct proxy for "when did the active verification link expire"
  // in the single case where the link was issued at initiation and never
  // resent. It breaks two real ways: PS-15 §6.2 EDD-released payouts have a
  // createdAt from days before release (already older than the TTL the
  // instant they enter PENDING_VERIFICATION — cancelled on the very next
  // tick), and any resent link (PS-14 §7) gets a fresh expiresAt that this
  // never looked at, so a legitimately-still-valid resent link could be
  // cancelled out from under the contractor. Keying off the actual
  // non-superseded verification record's own expiresAt is correct for both.
  @Cron('*/5 * * * *')
  async cancelExpiredVerifications(): Promise<void> {
    const now = new Date();

    const pending = await this.payoutRepo.find({
      where: { status: PayoutStatus.PENDING_VERIFICATION },
    });
    if (pending.length === 0) return;

    const expired: PayoutRequest[] = [];
    for (const payout of pending) {
      const activeVerification = await this.verificationRepo.findOne({
        where: { payoutRequestId: payout.id, superseded: false, used: false },
        order: { createdAt: 'DESC' },
      });
      // No active verification record at all shouldn't happen in practice
      // (generateAndStore() always runs before this status is set) but
      // fails toward cancelling rather than leaving the payout stuck forever.
      if (!activeVerification || activeVerification.expiresAt < now) {
        expired.push(payout);
      }
    }

    for (const payout of expired) {
      // Conditional on PENDING_VERIFICATION: a contractor who confirms the
      // link while this job runs has had their balance held and the payout
      // queued, and cancelling it here would strand that hold.
      const cancelled = await this.dataSource.transaction(async (em) => {
        const result = await em.update(
          PayoutRequest,
          { id: payout.id, status: PayoutStatus.PENDING_VERIFICATION },
          {
            status: PayoutStatus.CANCELLED,
            cancelledAt: new Date(),
            failureReason: 'magic_link_expired',
          },
        );
        return !!result.affected;
      });
      if (!cancelled) continue;

      await this.auditService.log({
        contractorId: payout.contractorId,
        payoutRequestId: payout.id,
        actorType: 'service',
        actorId: 'magic-link-expiry-job',
        action: 'payout.expired_cancelled',
        previousStatus: PayoutStatus.PENDING_VERIFICATION,
        newStatus: PayoutStatus.CANCELLED,
        metadata: { reason: 'magic_link_expired' },
      });

      // PMCM-285: this used to publish payout.failed as well, to reuse its
      // notification. earnings-service's consumer for that event credits the
      // amount back to available_balance, but an unconfirmed withdrawal never
      // had a hold (the hold is placed when the link is confirmed), so every
      // expired link added the withdrawal amount to the contractor's balance.
      // payout.cancelled below is the event that tells the contractor.
      // PS-14 §10: notification-service's spec'd consumer for this exact message.
      await this.publisher.publishPayoutCancelled({
        payoutRequestId: payout.id,
        contractorId: payout.contractorId,
        reason: 'magic_link_expired',
        message: 'Your withdrawal request expired because the email link was not confirmed. Your balance is unchanged.',
      });

      this.logger.log(`Cancelled expired payout: ${payout.id}`);
    }

    if (expired.length > 0) {
      this.logger.log(`Cancelled ${expired.length} expired verification(s)`);
    }
  }
}
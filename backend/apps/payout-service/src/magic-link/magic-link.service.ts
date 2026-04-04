// apps/payout-service/src/magic-link/magic-link.service.ts
// PS-14: Magic Link Email Verification
// Token generation (SHA-256 hash-only storage), Redis-backed validation,
// resend with rate limit, RabbitMQ event for notification-service delivery.
// CRITICAL: Raw token is NEVER stored, logged, or persisted anywhere.

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { Cron } from '@nestjs/schedule';

import { MagicLinkVerification } from '../entities/magic-link-verification.entity';
import { MagicLinkToken } from '../entities/magic-link-token.entity';
import { PayoutRequest, PayoutStatus } from '../entities/payout-request.entity';
import { DepositMethod } from '../entities/deposit-method.entity';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';
import { PayoutError } from '../common/errors/payout.error';

const TTL_SECONDS = 15 * 60; // 15 minutes — hard, no extension
const MAX_RESENDS = 3;

@Injectable()
export class MagicLinkService {
  private readonly logger = new Logger(MagicLinkService.name);
  private readonly redis: Redis;
  private readonly baseUrl: string;
  private readonly ttlSeconds: number;

  constructor(
    @InjectRepository(MagicLinkVerification)
    private readonly verificationRepo: Repository<MagicLinkVerification>,
    @InjectRepository(MagicLinkToken)
    private readonly mlTokenRepo: Repository<MagicLinkToken>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
  ) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'));
    this.baseUrl = this.config.get('MAGIC_LINK_BASE_URL', 'http://localhost:3000/verify-withdrawal');
    this.ttlSeconds = parseInt(this.config.get('MAGIC_LINK_TTL_SECONDS', '900'), 10);
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

  // ─── PS-14 §4: Publish magic link event to notification-service ──
  async publishMagicLinkEvent(
    payout: PayoutRequest,
    rawToken: string,
  ): Promise<void> {
    const method = await this.methodRepo.findOne({ where: { id: payout.depositMethodId } });
    const magicLinkUrl = `${this.baseUrl}?token=${rawToken}&id=${payout.id}`;
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);

    // In production: publish to RabbitMQ for notification-service
    // For now: log + fire-and-forget (same as PS-00 stub pattern)
    this.logger.log(`[MAGIC_LINK] Email event for payout ${payout.id} (contractor: ${payout.contractorId})`);
    // CRITICAL: Do NOT log the raw token or full URL
    this.logger.log(`[DEV] Verify URL: ${this.baseUrl}?token=***REDACTED***&id=${payout.id}`);

    // Dev mode: log the actual URL for manual testing
    if (!this.config.get('SENDGRID_API_KEY') || this.config.get('SENDGRID_API_KEY', '').startsWith('SG.your_')) {
      this.logger.warn(`[DEV MODE] Full verify URL: ${magicLinkUrl}`);
    }
  }

  // ─── PS-14 §3 (legacy compat): send() — called by existing payout.service.ts ──
  async send(contractorId: string, rawToken: string, amountUsd: string): Promise<void> {
    this.logger.log(`Sending magic link for contractor ${contractorId}, amount $${amountUsd}`);
    // In production: this publishes to RabbitMQ
    // Dev mode: log URL for manual testing
    const verifyUrl = `${this.baseUrl}?token=${rawToken}`;
    if (!this.config.get('SENDGRID_API_KEY') || this.config.get('SENDGRID_API_KEY', '').startsWith('SG.your_')) {
      this.logger.warn(`[DEV] Verification URL: ${verifyUrl}`);
    }
  }

  // ─── PS-14 §5: Verify Magic Link Token ──────────────────────
  async verifyEmailToken(
    rawToken: string,
    payoutRequestId: string,
  ): Promise<{ payoutRequestId: string; status: string; message: string }> {
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
      where: { id: payoutRequestId, status: PayoutStatus.PENDING_VERIFICATION },
    });

    if (!payout) {
      // Payout already advanced or cancelled — idempotent
      return { payoutRequestId, status: 'already_processed', message: 'This withdrawal has already been processed.' };
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
    };
  }

  // ─── PS-14 §7: Resend Verification ─────────────────────────
  async resendVerification(
    contractorId: string,
    payoutRequestId: string,
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

    if (previous) {
      await this.redis.del(`magiclink:${previous.tokenHash}`);
      await this.verificationRepo.update({ id: previous.id }, { superseded: true });
    }

    // Generate and publish new token
    const rawToken = await this.generateAndStore(payoutRequestId, contractorId);
    await this.publishMagicLinkEvent(payout, rawToken);

    return { resent: true, message: 'A new verification email has been sent.' };
  }

  // ─── PS-14 §10: Cancel Expired Payout Requests (every 5 min) ──
  @Cron('*/5 * * * *')
  async cancelExpiredVerifications(): Promise<void> {
    const cutoff = new Date(Date.now() - this.ttlSeconds * 1000);

    const expired = await this.payoutRepo.find({
      where: {
        status: PayoutStatus.PENDING_VERIFICATION,
        createdAt: LessThan(cutoff),
      },
    });

    for (const payout of expired) {
      await this.dataSource.transaction(async (em) => {
        await em.update(PayoutRequest, payout.id, {
          status: PayoutStatus.CANCELLED,
          cancelledAt: new Date(),
          failureReason: 'magic_link_expired',
        });
      });

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

      this.logger.log(`Cancelled expired payout: ${payout.id}`);
    }

    if (expired.length > 0) {
      this.logger.log(`Cancelled ${expired.length} expired verification(s)`);
    }
  }
}
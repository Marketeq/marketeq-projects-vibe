import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { IdentityVerificationStatus } from '../entities/enums/identity-verification.enums';
import { GRACE_WINDOW_MS, computeGateState } from '../common/gate/account-gate-decision';
import { GATE_CHANGE_PUBLISHER, GateChangePublisher } from '../gate-index/gate-change-publisher';

const DEFAULT_SWEEP_INTERVAL_MS = 30_000;
// After a restart the previous watermark is gone; look back this far for
// changes made while the service was down. Anything older is repaired by the
// periodic talent gate reconcile in user-service.
const DEFAULT_BOOT_LOOKBACK_MS = 15 * 60_000;
// Re-read this much before the watermark so a row committed just after the
// previous sweep read the table is never missed.
const OVERLAP_MS = 60_000;
// setTimeout cannot arm further out than ~24.8 days; the interval sweep re-arms
// closer to the time anyway.
const MAX_TIMER_MS = 24 * 60 * 60_000;
const EXPIRY_TIMER_SKEW_MS = 5;

/**
 * Keeps the talent search index's `gate_open` in step with the gate decision
 * this service owns (G1). Algolia is a derived copy: this job only PUBLISHES
 * the decision, never blocks or changes verification, and a broker or index
 * outage can only delay the copy, not the account's verification outcome.
 *
 * Why a sweep rather than a hook per write: the gate can change from many
 * paths (webhook approval, reconciliation, location confirmation, travel
 * mode, duplicate-document blocks, status auto-clear, ...), most through
 * partial `update()` calls that bypass entity listeners. Every one of them
 * bumps `updated_at`, so a profile whose row changed since the last sweep is
 * re-evaluated with the SAME `computeGateState` that answers the RPC gate
 * check and is published when its decision differs from the last one sent.
 *
 * Grace expiry has no write at all: the gate closes 30 days after
 * `expired_at` purely because time passes. Each sweep finds the next such
 * closure and arms a timer for its exact instant, with the interval sweep as
 * the safety net.
 *
 * Logs carry counts only - never an account id or a stored value.
 */
@Injectable()
export class GateVisibilitySweepJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GateVisibilitySweepJob.name);

  private watermarkMs: number | null = null;
  /** Last decision successfully published per account. Empty after a restart, so the lookback window re-publishes. */
  private readonly published = new Map<string, boolean>();
  private interval: NodeJS.Timeout | null = null;
  private expiryTimer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @InjectRepository(IdentityVerificationProfile)
    private readonly profiles: Repository<IdentityVerificationProfile>,
    @Inject(GATE_CHANGE_PUBLISHER) private readonly publisher: GateChangePublisher,
  ) {}

  onModuleInit(): void {
    if (process.env.GATE_INDEX_SYNC_DISABLED === 'true') {
      this.logger.warn('GATE_INDEX_SYNC_DISABLED=true - talent search gate propagation is off.');
      return;
    }
    if (!(process.env.RABBITMQ_URI || process.env.RABBITMQ_URL)) {
      this.logger.warn('No RabbitMQ URL set - talent search gate propagation is off.');
      return;
    }
    const every = Number(process.env.GATE_INDEX_SWEEP_INTERVAL_MS);
    this.interval = setInterval(
      () => void this.sweep(),
      Number.isFinite(every) && every > 0 ? every : DEFAULT_SWEEP_INTERVAL_MS,
    );
    this.interval.unref?.();
    void this.sweep();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.interval = this.expiryTimer = null;
  }

  async sweep(nowMs = Date.now()): Promise<{ published: number; failed: number }> {
    if (this.running) return { published: 0, failed: 0 };
    this.running = true;
    let publishedCount = 0;
    let failed = 0;
    try {
      const lookback = Number(process.env.GATE_INDEX_BOOT_LOOKBACK_MS);
      const watermark = this.watermarkMs ?? nowMs - (Number.isFinite(lookback) && lookback > 0 ? lookback : DEFAULT_BOOT_LOOKBACK_MS);
      const from = new Date(watermark - OVERLAP_MS);

      const changed = await this.profiles.find({ where: { updatedAt: MoreThanOrEqual(from) } });
      // Grace windows that closed since the last sweep: expired_at + 30 days fell in (from, now].
      const closed = await this.profiles.find({
        where: { expiredAt: Between(new Date(from.getTime() - GRACE_WINDOW_MS), new Date(nowMs - GRACE_WINDOW_MS)) },
      });

      const byUser = new Map<string, IdentityVerificationProfile>();
      for (const profile of [...changed, ...closed]) byUser.set(profile.userId, profile);

      for (const profile of byUser.values()) {
        const { gateOpen } = computeGateState(profile, nowMs);
        if (this.published.get(profile.userId) === gateOpen) continue;
        try {
          await this.publisher.publish({
            userId: profile.userId,
            gateOpen,
            occurredAt: new Date(this.occurredAtMs(profile, nowMs)).toISOString(),
          });
          this.published.set(profile.userId, gateOpen);
          publishedCount++;
        } catch {
          failed++;
        }
      }

      // Only advance when everything went out; otherwise the same window is
      // re-read next sweep (the `published` map keeps already-sent accounts
      // from being sent twice).
      if (failed === 0) this.watermarkMs = nowMs;
      if (publishedCount || failed) {
        this.logger.log(`Gate visibility sweep: ${publishedCount} published, ${failed} failed.`);
      }
      await this.armNextExpiry(nowMs);
    } catch {
      // No detail: could be a raw DB error. The next sweep retries the window.
      this.logger.error('Gate visibility sweep failed.');
    } finally {
      this.running = false;
    }
    return { published: publishedCount, failed };
  }

  /** When the state behind this decision came into being: the later of the last row change and a grace closure that has passed. */
  private occurredAtMs(profile: IdentityVerificationProfile, nowMs: number): number {
    let at = profile.updatedAt instanceof Date ? profile.updatedAt.getTime() : nowMs;
    if (profile.expiredAt instanceof Date) {
      const closesAt = profile.expiredAt.getTime() + GRACE_WINDOW_MS;
      if (closesAt <= nowMs) at = Math.max(at, closesAt);
    }
    return at;
  }

  /** Arms a timer for the instant the next grace window closes, so a closure is not left to the interval. */
  private async armNextExpiry(nowMs: number): Promise<void> {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    const row = await this.profiles
      .createQueryBuilder('p')
      .select('MIN(p.expired_at)', 'next')
      .where('p.expired_at > :floor', { floor: new Date(nowMs - GRACE_WINDOW_MS) })
      .andWhere('p.identity_verification_status != :verified', { verified: IdentityVerificationStatus.VERIFIED })
      .getRawOne<{ next: Date | string | null }>();
    if (!row?.next) return;
    const closesAt = new Date(row.next).getTime() + GRACE_WINDOW_MS;
    const delay = closesAt - nowMs + EXPIRY_TIMER_SKEW_MS;
    if (!(delay > 0) || delay > MAX_TIMER_MS) return;
    this.expiryTimer = setTimeout(() => void this.sweep(), delay);
    this.expiryTimer.unref?.();
  }
}

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AlgoliaClient } from '../sync/algolia.client'
import { AlgoliaIndex } from '../dto/sync.dto'
import { GateChangedPayload, ListingOwnerGateBackfillPayload, TalentGateBackfillPayload } from '../types/event-payloads'

// G1 marketplace discovery gate - the Algolia side. identity-verification-service
// owns gate_open and tells us when it may have changed; we mirror the decision
// onto the talent records as `gate_open`, which every marketplace talent query
// filters on (search-service). Algolia is therefore a derived copy: it can lag
// or be briefly wrong, it is never the source of truth, and no account's
// verification depends on it being available.
//
// Fail-closed by construction: a record with no `gate_open` (never synced, or
// not yet backfilled) does not match `gate_open:true` and stays hidden.
//
// Records are only ever PARTIALLY updated - a verification change touches
// `gate_open` and nothing else, and never deletes or recreates a record.

// Indices whose records carry an `owner_id` (the listing owner's account).
const LISTING_INDEXES = [AlgoliaIndex.PROJECTS, AlgoliaIndex.SERVICES, AlgoliaIndex.TEAMS]

const DEFAULT_ALERT_THRESHOLD_MS = 5 * 60 * 1000
const DEFAULT_RETRY_INTERVAL_MS = 15 * 1000
const ALERT_CHECK_INTERVAL_MS = 60 * 1000
const BACKFILL_ATTEMPTS = 3

interface PendingGate {
  userId: string
  gateOpen: boolean
  occurredAtMs: number
  firstFailedAtMs: number
  attempts: number
  nextAttemptAtMs: number
  lastError: string
}

export interface GateSyncHealth {
  pending: number
  oldestPendingAgeMs: number
  lastLagMs: number | null
  maxLagMs: number
  thresholdMs: number
  alert: boolean
  reasons: string[]
}

export const backoffMs = (attempts: number): number => Math.min(5000 * 2 ** Math.max(0, attempts - 1), 120_000)

@Injectable()
export class GateSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GateSyncService.name)

  /** Newest decision time written to the index, per account. Drops stale/out-of-order events. */
  private readonly applied = new Map<string, number>()
  /** Gate changes the index has not accepted yet (latest per account). */
  private readonly pending = new Map<string, PendingGate>()
  private lastLagMs: number | null = null
  private maxLagMs = 0
  private lastAlertLoggedAtMs = 0
  private timers: NodeJS.Timeout[] = []

  constructor(
    private readonly algolia: AlgoliaClient,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const retry = setInterval(() => void this.retryDue(), this.retryIntervalMs)
    const alert = setInterval(() => this.checkAlerts(), ALERT_CHECK_INTERVAL_MS)
    retry.unref?.()
    alert.unref?.()
    this.timers.push(retry, alert)
  }

  onModuleDestroy() {
    this.timers.forEach(clearInterval)
    this.timers = []
  }

  /**
   * Engineering assumption: no repository standard exists for index-propagation
   * monitoring, so the alert threshold is a configurable five minutes
   * (ALGOLIA_GATE_SYNC_ALERT_THRESHOLD_MS) - comfortably above normal
   * event-to-index latency, short enough that a stuck update is seen quickly.
   */
  get thresholdMs(): number {
    const n = Number(this.config.get<string>('ALGOLIA_GATE_SYNC_ALERT_THRESHOLD_MS'))
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_ALERT_THRESHOLD_MS
  }

  private get retryIntervalMs(): number {
    const n = Number(this.config.get<string>('ALGOLIA_GATE_SYNC_RETRY_INTERVAL_MS'))
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_RETRY_INTERVAL_MS
  }

  /** A gate change from identity-verification-service. Never throws: failures are retried. */
  async applyGateChange(payload: GateChangedPayload, now = Date.now()): Promise<void> {
    if (!payload || typeof payload.userId !== 'string' || !payload.userId || typeof payload.gateOpen !== 'boolean') {
      this.logger.warn('Ignoring malformed gate change event')
      return
    }
    const parsed = Date.parse(payload.occurredAt)
    const occurredAtMs = Number.isFinite(parsed) ? parsed : now

    if (occurredAtMs < (this.applied.get(payload.userId) ?? 0)) return // an older decision than one already written
    const waiting = this.pending.get(payload.userId)
    if (waiting && occurredAtMs < waiting.occurredAtMs) return // a newer decision is already queued

    await this.write({
      userId: payload.userId,
      gateOpen: payload.gateOpen,
      occurredAtMs,
      firstFailedAtMs: waiting?.firstFailedAtMs ?? now,
      attempts: waiting?.attempts ?? 0,
      nextAttemptAtMs: now,
      lastError: '',
    }, now)
  }

  private async write(change: PendingGate, now: number): Promise<void> {
    try {
      const objectIDs = await this.algolia.findObjectIDs(AlgoliaIndex.TALENT, 'account_id', change.userId)
      if (objectIDs.length > 0) {
        await this.algolia.partialUpdateBatch(
          AlgoliaIndex.TALENT,
          objectIDs.map((objectID) => ({ objectID, gate_open: change.gateOpen, gate_updated_at: change.occurredAtMs })),
          false,
        )
      }
      // G5: the same decision hides or shows the LISTINGS this account owns
      // (`owner_hidden`), found by `owner_id` in each listing index. The listing
      // records are partially updated like talent; nothing is deleted, and the
      // stored listing's published status is not involved.
      for (const index of LISTING_INDEXES) {
        const listingIDs = await this.algolia.findObjectIDs(index, 'owner_id', change.userId)
        if (listingIDs.length > 0) {
          await this.algolia.partialUpdateBatch(
            index,
            listingIDs.map((objectID) => ({ objectID, owner_hidden: !change.gateOpen, owner_gate_updated_at: change.occurredAtMs })),
            false,
          )
        }
      }
      // No record (yet) is not a failure: the profile's own sync carries the
      // gate when it is indexed, and until then there is nothing to show.
      this.applied.set(change.userId, change.occurredAtMs)
      this.pending.delete(change.userId)
      this.recordLag(Math.max(0, now - change.occurredAtMs))
    } catch (err) {
      const attempts = change.attempts + 1
      const message = err instanceof Error ? err.message : String(err)
      this.pending.set(change.userId, {
        ...change,
        attempts,
        nextAttemptAtMs: now + backoffMs(attempts),
        lastError: message,
      })
      this.logger.warn(`Gate index update failed for an account (attempt ${attempts}); will retry: ${message}`)
    }
  }

  /** Retries every failed update whose backoff has elapsed. Called on a timer. */
  async retryDue(now = Date.now()): Promise<number> {
    const due = [...this.pending.values()].filter((p) => p.nextAttemptAtMs <= now)
    for (const change of due) await this.write(change, now)
    return due.length
  }

  /**
   * Should a gate decision that arrived inside a profile sync still be written?
   * Not if a newer decision for the account has already been applied.
   */
  isGateCurrent(accountId: string | null | undefined, checkedAtMs: number): boolean {
    if (!accountId) return true
    return checkedAtMs >= (this.applied.get(accountId) ?? 0)
  }

  /** Records that a decision made at `checkedAtMs` was written (by a profile sync), so older events are dropped. */
  noteGateApplied(accountId: string | null | undefined, checkedAtMs: number): void {
    if (!accountId) return
    this.applied.set(accountId, Math.max(this.applied.get(accountId) ?? 0, checkedAtMs))
  }

  /** Repeatable backfill/reconcile batch from user-service. Partial updates only; unknown records are not created. */
  async applyBackfill(payload: TalentGateBackfillPayload): Promise<{ updated: number }> {
    const entries = (payload?.entries ?? []).filter(
      (e) => e && typeof e.id === 'string' && e.id && typeof e.accountId === 'string' && e.accountId && typeof e.gateOpen === 'boolean',
    )
    if (entries.length === 0) return { updated: 0 }
    const checkedAt = Date.parse(payload.checkedAt)
    const checkedAtMs = Number.isFinite(checkedAt) ? checkedAt : Date.now()

    // A newer decision already written for an account wins over this batch's.
    const fresh = entries.filter((e) => this.isGateCurrent(e.accountId, checkedAtMs))
    const objects = fresh.map((e) => ({
      objectID: e.id,
      account_id: e.accountId,
      gate_open: e.gateOpen,
      gate_updated_at: checkedAtMs,
    }))

    let lastError: unknown
    for (let attempt = 1; attempt <= BACKFILL_ATTEMPTS; attempt++) {
      try {
        await this.algolia.partialUpdateBatch(AlgoliaIndex.TALENT, objects, false)
        for (const e of fresh) this.applied.set(e.accountId, Math.max(this.applied.get(e.accountId) ?? 0, checkedAtMs))
        this.recordLag(Math.max(0, Date.now() - checkedAtMs))
        return { updated: objects.length }
      } catch (err) {
        lastError = err
        this.logger.warn(`Talent gate backfill batch failed (attempt ${attempt}/${BACKFILL_ATTEMPTS})`)
        if (attempt < BACKFILL_ATTEMPTS) await new Promise((r) => setTimeout(r, 250 * attempt))
      }
    }
    // The next scheduled reconcile re-sends this batch; surface the failure now.
    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  }

  /**
   * G5: sets the listing-owner gate on listing records in bulk. Partial updates
   * that create nothing, repeatable, and a newer decision already written for the
   * owner wins over an older batch.
   */
  async applyOwnerBackfill(payload: ListingOwnerGateBackfillPayload): Promise<{ updated: number }> {
    const valid = (payload?.entries ?? []).filter(
      (e) =>
        e &&
        [AlgoliaIndex.PROJECTS, AlgoliaIndex.SERVICES, AlgoliaIndex.TEAMS].includes(e.index as AlgoliaIndex) &&
        typeof e.id === 'string' && e.id &&
        typeof e.ownerId === 'string' && e.ownerId &&
        typeof e.ownerGateOpen === 'boolean',
    )
    const checkedAt = Date.parse(payload?.checkedAt)
    const checkedAtMs = Number.isFinite(checkedAt) ? checkedAt : Date.now()
    const fresh = valid.filter((e) => this.isGateCurrent(e.ownerId, checkedAtMs))
    if (fresh.length === 0) return { updated: 0 }

    const byIndex = new Map<string, Array<Record<string, unknown> & { objectID: string }>>()
    for (const e of fresh) {
      const list = byIndex.get(e.index) ?? []
      list.push({ objectID: e.id, owner_id: e.ownerId, owner_hidden: !e.ownerGateOpen, owner_gate_updated_at: checkedAtMs })
      byIndex.set(e.index, list)
    }
    for (const [index, objects] of byIndex) {
      let lastError: unknown
      let done = false
      for (let attempt = 1; attempt <= BACKFILL_ATTEMPTS && !done; attempt++) {
        try {
          await this.algolia.partialUpdateBatch(index, objects, false)
          done = true
        } catch (err) {
          lastError = err
          this.logger.warn(`Listing owner gate backfill batch failed (attempt ${attempt}/${BACKFILL_ATTEMPTS})`)
          if (attempt < BACKFILL_ATTEMPTS) await new Promise((r) => setTimeout(r, 250 * attempt))
        }
      }
      if (!done) throw lastError instanceof Error ? lastError : new Error(String(lastError))
    }
    return { updated: fresh.length }
  }

  private recordLag(lagMs: number) {
    this.lastLagMs = lagMs
    if (lagMs > this.maxLagMs) this.maxLagMs = lagMs
  }

  getHealth(now = Date.now()): GateSyncHealth {
    const oldest = [...this.pending.values()].reduce((age, p) => Math.max(age, now - p.firstFailedAtMs), 0)
    const reasons: string[] = []
    if (oldest > this.thresholdMs) reasons.push(`oldest unapplied gate update is ${Math.round(oldest / 1000)}s old`)
    if (this.maxLagMs > this.thresholdMs) reasons.push(`event-to-index lag reached ${Math.round(this.maxLagMs / 1000)}s`)
    return {
      pending: this.pending.size,
      oldestPendingAgeMs: oldest,
      lastLagMs: this.lastLagMs,
      maxLagMs: this.maxLagMs,
      thresholdMs: this.thresholdMs,
      alert: reasons.length > 0,
      reasons,
    }
  }

  /** Logs an error-level alert while propagation is over the threshold, then starts a new lag window. */
  checkAlerts(now = Date.now()): GateSyncHealth {
    const health = this.getHealth(now)
    if (health.alert && now - this.lastAlertLoggedAtMs >= ALERT_CHECK_INTERVAL_MS) {
      this.lastAlertLoggedAtMs = now
      this.logger.error(
        `[gate-sync-alert] talent gate propagation over ${Math.round(health.thresholdMs / 1000)}s: ` +
          `${health.reasons.join('; ')} (pending=${health.pending})`,
      )
    }
    this.maxLagMs = 0
    return health
  }
}

// src/main/services/sync/sync-worker.ts
//
// Phase 4 — Background worker that drains the outbox into the api-client.
//
// Responsibilities (doc 16 §4):
//   1. Loop: claim a batch of pending rows, dispatch via api-client,
//      mark done/failed.
//   2. Respect `next_retry_at` (the outbox filters for us).
//   3. Pause when the NetworkMonitor reports offline; resume the moment
//      it reports online.
//   4. Emit sync:progress / sync:error / sync:idle events for the IPC
//      layer.
//   5. Graceful shutdown drain on app quit.
//
// The worker is intentionally a thin state machine; all policy lives in
// either the outbox (retry budget) or the api-client (transport retries).

import { EventEmitter } from 'node:events';
import axios from 'axios';
import type { Logger } from 'pino';
import type { ApiClient } from './api-client';
import type { NetworkMonitor } from './network-monitor';
import { VERIFICATION_GATED_KINDS, type Outbox, type OutboxRow } from './outbox';

export interface SyncProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
}

export interface SyncWorkerEvents {
  on(ev: 'sync:progress', cb: (p: SyncProgress) => void): this;
  on(ev: 'sync:error', cb: (err: { id: string; message: string }) => void): this;
  on(ev: 'sync:idle', cb: () => void): this;
  on(ev: 'sync:status-changed', cb: (s: SyncStatus) => void): this;
  off(ev: 'sync:progress', cb: (p: SyncProgress) => void): this;
  off(ev: 'sync:error', cb: (err: { id: string; message: string }) => void): this;
  off(ev: 'sync:idle', cb: () => void): this;
  off(ev: 'sync:status-changed', cb: (s: SyncStatus) => void): this;
}

export interface SyncStatus {
  online: boolean;
  running: boolean;
  queueDepth: number;
  deadLetterCount: number;
  lastSyncAt: number | null;
  lastError: string | null;
}

export interface SyncWorkerDeps {
  api: ApiClient;
  outbox: Outbox;
  network: NetworkMonitor;
  logger?: Logger;
  /** Max rows to dispatch per tick. */
  batchSize?: number;
  /** Polling interval (ms) while idle. */
  pollIntervalMs?: number;
  /** 24h retention sweep interval (ms). */
  retentionSweepMs?: number;
  /** Retention max-age for completed rows (ms). Defaults to 24h. */
  retentionMaxAgeMs?: number;
}

export type SyncWorker = ReturnType<typeof createSyncWorker>;

/** Error code time-tracking-service answers with when the gate cannot be evaluated. */
export const GATE_UNAVAILABLE_CODE = 'IDENTITY_VERIFICATION_UNAVAILABLE';

/** Error code time-tracking-service answers with when the talent is not verified. */
export const VERIFICATION_REQUIRED_CODE = 'VERIFICATION_REQUIRED';

/** True when a 503 body carries the gate-unavailable code, however the gateway wraps it. */
export function isGateUnavailable(data: unknown): boolean {
  return carriesCode(data, GATE_UNAVAILABLE_CODE);
}

/** True when a 403 body carries the verification-required code, however the gateway wraps it. */
export function isVerificationRequired(data: unknown): boolean {
  return carriesCode(data, VERIFICATION_REQUIRED_CODE);
}

function carriesCode(data: unknown, code: string): boolean {
  const seen = new Set<unknown>();
  const visit = (v: unknown, depth: number): boolean => {
    if (v === code) return true;
    if (!v || typeof v !== 'object' || depth > 3 || seen.has(v)) return false;
    seen.add(v);
    const o = v as Record<string, unknown>;
    return visit(o.error, depth + 1) || visit(o.code, depth + 1) || visit(o.message, depth + 1);
  };
  return visit(data, 0);
}

export function createSyncWorker(deps: SyncWorkerDeps) {
  const log = deps.logger?.child({ svc: 'sync-worker' });
  const bus = new EventEmitter() as EventEmitter & SyncWorkerEvents;
  const batchSize = deps.batchSize ?? 10;
  const pollIntervalMs = deps.pollIntervalMs ?? 5_000;
  const retentionSweepMs = deps.retentionSweepMs ?? 60 * 60_000; // 1h
  const retentionMaxAgeMs = deps.retentionMaxAgeMs ?? 24 * 60 * 60_000; // 24h

  let pollHandle: NodeJS.Timeout | null = null;
  let sweepHandle: NodeJS.Timeout | null = null;
  let draining = false;
  let running = false;
  let lastSyncAt: number | null = null;
  let lastError: string | null = null;
  let shutdownPromise: Promise<void> | null = null;
  // Set by stop() once the final-drain grace period is over: a drain still
  // running finishes the row it is on but claims no new batch.
  let stopping = false;

  // Doc 16 §4: flush only when the probe says Online. 'Degraded' (one or two
  // failed probes) still reports online=true, and draining then is what used
  // to burn every retry within a minute of an outage starting.
  const isOnline = () => deps.network.detail === 'Online';

  const offOnlineChanged = (online: boolean) => {
    if (online) {
      log?.info('network back online — kicking sync');
      // Recover work an earlier outage dead-lettered before network failures
      // stopped counting as attempts.
      deps.outbox.requeueNetworkDeadLetters();
      void drain();
    } else {
      log?.info('network offline — sync paused');
      emitStatus();
    }
  };

  function getStatus(): SyncStatus {
    const stats = deps.outbox.stats();
    return {
      online: deps.network.online,
      running,
      queueDepth: stats.pending + stats.inflight,
      deadLetterCount: stats.deadLetter,
      lastSyncAt,
      lastError,
    };
  }

  function emitStatus(): void {
    bus.emit('sync:status-changed', getStatus());
  }

  // ---------------------------------------------------------------------------
  // Dispatch a single outbox row through the api-client
  // ---------------------------------------------------------------------------

  async function dispatch(row: OutboxRow): Promise<void> {
    const resp = await deps.api.raw({
      method: row.method,
      path: row.path,
      body: row.payload,
      idempotencyKey: row.id,
      noRetry: true,
    });
    if (resp.status >= 200 && resp.status < 300) {
      deps.outbox.markDone(row.id);
      lastSyncAt = Date.now();
      return;
    }
    // Two copies of the same create landed at once (e.g. a retry racing the
    // original after reconnect): the server saved one and rejected the other
    // as a duplicate key. The data is on the server, so this row is done.
    const message = (resp.data as { message?: unknown } | undefined)?.message;
    if (resp.status === 409 && message === 'Duplicate key') {
      deps.outbox.markDone(row.id);
      lastSyncAt = Date.now();
      return;
    }
    // Non-2xx — decide retryable vs dead-letter per doc 16 §5. 401 is
    // deliberately excluded here (matching doc 16 §4's reference queue
    // exactly) — a 401 reaching this layer means api-client's own
    // refresh-and-retry (doc 15 §7) already gave it a fresh token and
    // failed anyway, so the queue treats it like any other non-retryable
    // 4xx, same as the doc's example code.
    const s = resp.status;
    const retryable = s === 408 || s === 429 || (s >= 500 && s <= 599);
    const msg = `HTTP ${s}`;
    // The server could not confirm the talent's verification status
    // (identity-verification-service restarting, slow or unreachable) and
    // refused the write WITHOUT saving anything. Like an offline device, that
    // is an outage rather than a verdict on this row, so it waits and tries
    // again forever instead of spending one of its attempts. Otherwise a
    // restart lasting about a minute would dead-letter every queued session,
    // entry, break and idle. A closed gate (403 VERIFICATION_REQUIRED) is a
    // real answer and is NOT handled here.
    if (s === 503 && isGateUnavailable(resp.data)) {
      deps.outbox.markFailed(row.id, `${msg} ${GATE_UNAVAILABLE_CODE}`, { retryable: true, transient: true });
      throw new DispatchError(row.id, msg, true);
    }
    // The talent is not verified (403 VERIFICATION_REQUIRED). That is a state
    // that ends when they verify again, not a verdict on this row: the work is
    // kept as queued (same payload, same idempotency key), spends no attempt
    // and is never dead-lettered, and retries slowly with jitter until the
    // gate opens. Every other 403 is NOT handled here and keeps dead-lettering.
    if (s === 403 && isVerificationRequired(resp.data)) {
      deps.outbox.holdForVerification(row.id, `${msg} ${VERIFICATION_REQUIRED_CODE}`);
      throw new DispatchError(row.id, msg, true, true);
    }
    deps.outbox.markFailed(row.id, msg, { retryable });
    throw new DispatchError(row.id, msg, retryable);
  }

  async function dispatchWithCatch(row: OutboxRow): Promise<'ok' | 'retry' | 'dead' | 'held'> {
    try {
      await dispatch(row);
      if (VERIFICATION_GATED_KINDS.has(row.kind)) deps.outbox.clearVerificationHold();
      return 'ok';
    } catch (err) {
      if (err instanceof DispatchError) {
        bus.emit('sync:error', { id: row.id, message: err.message });
        lastError = err.message;
        if (err.held) return 'held';
        return err.retryable ? 'retry' : 'dead';
      }
      // Network / timeout / unknown — always retryable. A request that never
      // got an HTTP response (offline, DNS, refused, timed out) is transient:
      // it waits for the network instead of spending one of its attempts.
      const msg = describe(err);
      const transient = axios.isAxiosError(err) && !err.response;
      deps.outbox.markFailed(row.id, msg, { retryable: true, transient });
      bus.emit('sync:error', { id: row.id, message: msg });
      lastError = msg;
      return 'retry';
    }
  }

  // ---------------------------------------------------------------------------
  // Drain loop
  // ---------------------------------------------------------------------------

  async function drain(): Promise<void> {
    if (draining) return;
    if (!isOnline()) {
      emitStatus();
      return;
    }
    draining = true;
    running = true;
    emitStatus();
    try {
      // We drain until the outbox has nothing claimable in a single pass.
      // Progress events are emitted after every row.
      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      let deadLettered = 0;
      // Safety: don't loop forever on a pathological queue.
      const maxIterations = 100;
      for (let i = 0; i < maxIterations; i++) {
        if (!isOnline()) {
          log?.info('network dropped mid-drain — pausing');
          break;
        }
        if (stopping) break;
        const batch = deps.outbox.claimNext(batchSize);
        if (batch.length === 0) break;
        let gateHeld = false;
        for (const row of batch) {
          // The gate just answered "not verified": the rest of the gated work
          // in this batch waits with it, with no request. Un-gated kinds go on.
          if (gateHeld && VERIFICATION_GATED_KINDS.has(row.kind)) {
            deps.outbox.releaseToVerificationHold(row.id);
            continue;
          }
          const result = await dispatchWithCatch(row);
          processed++;
          if (result === 'held') gateHeld = true;
          if (result === 'ok') succeeded++;
          else if (result === 'retry' || result === 'held') failed++;
          else if (result === 'dead') deadLettered++;
          const stats = deps.outbox.stats();
          bus.emit('sync:progress', {
            total: stats.pending + stats.inflight + processed,
            processed,
            succeeded,
            failed,
            deadLettered,
          });
        }
      }
      bus.emit('sync:idle');
      if (processed > 0) {
        log?.info({ processed, succeeded, failed, deadLettered }, 'drain complete');
      }
    } finally {
      draining = false;
      running = false;
      emitStatus();
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  function start(): void {
    if (pollHandle) return;
    deps.network.on('net:online-changed', offOnlineChanged);
    pollHandle = setInterval(() => {
      if (isOnline()) void drain();
    }, pollIntervalMs);
    if (pollHandle.unref) pollHandle.unref();
    sweepHandle = setInterval(() => {
      try {
        deps.outbox.purgeDone(retentionMaxAgeMs);
      } catch (err) {
        log?.warn({ err }, 'retention sweep failed');
      }
    }, retentionSweepMs);
    if (sweepHandle.unref) sweepHandle.unref();
    log?.info('sync-worker started');
    // Work an earlier outage dead-lettered (before network failures stopped
    // counting as attempts) gets another chance on every launch.
    deps.outbox.requeueNetworkDeadLetters();
    // Immediate kick.
    void drain();
  }

  function stop(): Promise<void> {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      if (pollHandle) {
        clearInterval(pollHandle);
        pollHandle = null;
      }
      if (sweepHandle) {
        clearInterval(sweepHandle);
        sweepHandle = null;
      }
      deps.network.off('net:online-changed', offOnlineChanged);
      // Final drain with a short grace period so writes in flight have
      // a chance to complete.
      if (isOnline()) {
        try {
          await Promise.race([
            drain(),
            new Promise<void>((r) => setTimeout(r, 2_000).unref?.()),
          ]);
        } catch (err) {
          log?.warn({ err }, 'final drain errored');
        }
      }
      stopping = true;
      log?.info('sync-worker stopped');
    })();
    return shutdownPromise;
  }

  async function forceRun(): Promise<SyncStatus> {
    await drain();
    return getStatus();
  }

  return {
    start,
    stop,
    forceRun,
    getStatus,
    on: bus.on.bind(bus),
    off: bus.off.bind(bus),
  };
}

class DispatchError extends Error {
  readonly id: string;
  readonly retryable: boolean;
  /** The gate said "not verified": the row was held, not failed. */
  readonly held: boolean;
  constructor(id: string, message: string, retryable: boolean, held = false) {
    super(message);
    this.name = 'DispatchError';
    this.id = id;
    this.retryable = retryable;
    this.held = held;
  }
}

function describe(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

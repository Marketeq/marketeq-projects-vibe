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
import type { Outbox, OutboxRow } from './outbox';

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

  const offOnlineChanged = (online: boolean) => {
    if (online) {
      log?.info('network back online — kicking sync');
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
    // Non-2xx — decide retryable vs dead-letter per doc 16 §5. 401 is
    // deliberately excluded here (matching doc 16 §4's reference queue
    // exactly) — a 401 reaching this layer means api-client's own
    // refresh-and-retry (doc 15 §7) already gave it a fresh token and
    // failed anyway, so the queue treats it like any other non-retryable
    // 4xx, same as the doc's example code.
    const s = resp.status;
    const retryable = s === 408 || s === 429 || (s >= 500 && s <= 599);
    const msg = `HTTP ${s}`;
    deps.outbox.markFailed(row.id, msg, { retryable });
    throw new DispatchError(row.id, msg, retryable);
  }

  async function dispatchWithCatch(row: OutboxRow): Promise<'ok' | 'retry' | 'dead'> {
    try {
      await dispatch(row);
      return 'ok';
    } catch (err) {
      if (err instanceof DispatchError) {
        bus.emit('sync:error', { id: row.id, message: err.message });
        lastError = err.message;
        return err.retryable ? 'retry' : 'dead';
      }
      // Network / timeout / unknown — always retryable.
      const msg = describe(err);
      deps.outbox.markFailed(row.id, msg, { retryable: true });
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
    if (!deps.network.online) {
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
        if (!deps.network.online) {
          log?.info('network dropped mid-drain — pausing');
          break;
        }
        const batch = deps.outbox.claimNext(batchSize);
        if (batch.length === 0) break;
        for (const row of batch) {
          const result = await dispatchWithCatch(row);
          processed++;
          if (result === 'ok') succeeded++;
          else if (result === 'retry') failed++;
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
      if (deps.network.online) void drain();
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
      if (deps.network.online) {
        try {
          await Promise.race([
            drain(),
            new Promise<void>((r) => setTimeout(r, 2_000).unref?.()),
          ]);
        } catch (err) {
          log?.warn({ err }, 'final drain errored');
        }
      }
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
  constructor(id: string, message: string, retryable: boolean) {
    super(message);
    this.name = 'DispatchError';
    this.id = id;
    this.retryable = retryable;
  }
}

function describe(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

// src/main/services/sync/outbox.ts
//
// Phase 4 — Outbox queue wrapping the Phase 1 `sync_queue` table + repo.
//
// Responsibilities (doc 16 §2, §4, §7):
//   1. Typed enqueue API taking a discriminated-union `OutboxKind` payload
//      so callers can't accidentally invent ad-hoc paths.
//   2. FIFO ordering by `created_at` (§1-3).
//   3. Idempotency keys per doc 16 §1 — the row id *is* the key; callers
//      may inject one (e.g. the session id) so retries collapse.
//   4. claimNext / markDone / markFailed primitives with a pluggable
//      storage backend (repo for prod, in-memory for tests).
//   5. Dead-letter after MAX_ATTEMPTS per doc 16 §4 or on any non-retryable
//      4xx.
//   6. `stats()` + `purgeDone(before)` for diagnostics + the 24h sweep.
//
// This module owns zero network concerns — the sync-worker pulls via
// `claimNext()` and pushes the result back via `markDone`/`markFailed`.

import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type OutboxStatus = 'pending' | 'inflight' | 'completed' | 'dead_letter';

export type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Discriminated union of every payload the outbox can hold. `kind` maps
 * 1:1 to a method on the `ApiClient`. Adding a new kind is the only
 * change needed to wire a new background write.
 */
export type OutboxKind =
  | 'session.start'
  | 'session.close'
  | 'session.takeOver'
  | 'time-entry.create'
  | 'time-entry.patch'
  | 'break.start'
  | 'break.end'
  | 'idle.create'
  | 'screenshot.confirm'
  | 'activity.batch'
  | 'device.heartbeat';

/** A persisted outbox row. Mirrors the `sync_queue` table exactly. */
export interface OutboxRow {
  id: string;
  kind: OutboxKind;
  method: HttpMethod;
  path: string;
  payload: unknown;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  lastAttemptAt: number | null;
  nextRetryAt: number | null;
  createdAt: number;
  completedAt: number | null;
}

export interface OutboxEnqueueInput {
  kind: OutboxKind;
  method: HttpMethod;
  path: string;
  payload: unknown;
  /** Optional caller-supplied idempotency key. Must be unique per logical op. */
  id?: string;
}

export interface OutboxStats {
  pending: number;
  inflight: number;
  deadLetter: number;
  completed: number;
  oldestPendingCreatedAt: number | null;
}

// Dead-letter threshold (doc 16 §1 — "Dead-letter after 5 retries").
export const MAX_ATTEMPTS = 5;
// Base delay for in-outbox retry backoff (doc 16 §4).
export const BASE_BACKOFF_MS = 2_000;
export const MAX_BACKOFF_MS = 5 * 60_000;
// Retry delay (plus up to the same again as jitter) after a transient,
// no-response failure. Attempts are not counted for these.
export const TRANSIENT_RETRY_MS = 15_000;
// G8: when the identity gate answers 403 VERIFICATION_REQUIRED the talent is
// not verified, so queued time work waits for them to verify again. It retries
// no sooner than this (plus up to the same again as jitter, so 5-10 minutes),
// so an unverified account never produces continuous request traffic. Attempts
// are not counted: the work is kept until the gate opens.
export const VERIFICATION_RETRY_MS = 5 * 60_000;
// The kinds time-tracking-service gates on verification (sessions, entries,
// breaks, idles). Screenshots, activity, heartbeat and take-over are
// un-gated server side, so a closed gate never holds them back.
export const VERIFICATION_GATED_KINDS: ReadonlySet<OutboxKind> = new Set<OutboxKind>([
  'session.start',
  'session.close',
  'time-entry.create',
  'time-entry.patch',
  'break.start',
  'break.end',
  'idle.create',
]);

// -----------------------------------------------------------------------------
// Storage interface — the outbox can be backed by SQLite (prod) or an
// in-memory map (tests), without any coupling to better-sqlite3.
// -----------------------------------------------------------------------------

export interface OutboxStore {
  insert(row: OutboxRow): void;
  findById(id: string): OutboxRow | null;
  /** Returns up to `limit` pending rows whose next_retry_at is <= now, oldest first. */
  findClaimable(now: number, limit: number): OutboxRow[];
  update(row: OutboxRow): void;
  count(status: OutboxStatus): number;
  oldestPendingCreatedAt(): number | null;
  deleteCompletedBefore(cutoff: number): number;
  /** All dead-lettered rows, oldest first. */
  listDeadLetters(): OutboxRow[];
  /** Returns every 'inflight' row to 'pending'. Returns the number reset. */
  resetInflight(): number;
  // Test helpers
  _all?(): OutboxRow[];
}

// -----------------------------------------------------------------------------
// Default SQLite-backed store (works against the existing sync_queue table)
// -----------------------------------------------------------------------------

import type { DbHandle } from '../../db/connection';

/**
 * Encrypts payloads at rest (PMCM-832). Production wires Electron's
 * safeStorage (DPAPI on Windows, Keychain on macOS); `available()` is checked
 * on every write because safeStorage can be unavailable before app ready
 * (and on Linux without a keyring).
 */
export interface OutboxPayloadCipher {
  available(): boolean;
  encrypt(plain: string): string;
  decrypt(sealed: string): string;
}

// Kinds whose payload carries screen images (the screenshot itself plus the
// active apps' icons). Their payload is only ever written encrypted, and is
// wiped once the backend acknowledges the upload (PMCM-832, DTT-119/218).
export const SEALED_KINDS: ReadonlySet<OutboxKind> = new Set<OutboxKind>([
  'screenshot.confirm',
]);

/**
 * The payload without any image data. Used when no cipher is available, so
 * a screenshot is never written to disk in the clear: the capture metadata
 * still syncs, the image does not.
 */
export function stripImages(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const { imageBase64: _image, apps, ...rest } = payload as Record<string, unknown>;
  return {
    ...rest,
    ...(Array.isArray(apps)
      ? {
          apps: apps.map((a) => {
            if (!a || typeof a !== 'object') return a;
            const { iconBase64: _icon, ...app } = a as Record<string, unknown>;
            return app;
          }),
        }
      : {}),
  };
}

function parseRowWith(
  raw: Record<string, unknown>,
  cipher?: OutboxPayloadCipher | null,
  log?: Logger,
): OutboxRow {
  let payload: unknown = null;
  try {
    payload = raw.body_json ? JSON.parse(raw.body_json as string) : null;
  } catch {
    payload = null;
  }
  const kindFromBody = extractKindFromBody(payload);
  let data = stripInternalKind(payload);
  if (payload && typeof payload === 'object' && 'sealed' in (payload as Record<string, unknown>)) {
    data = null;
    try {
      if (cipher) data = JSON.parse(cipher.decrypt((payload as { sealed: string }).sealed));
    } catch (err) {
      log?.warn({ err, id: raw.id }, 'outbox: could not decrypt sealed payload');
    }
  }
  return {
    id: raw.id as string,
    kind: (kindFromBody ?? 'session.start') as OutboxKind,
    method: raw.method as HttpMethod,
    path: raw.path as string,
    payload: data,
    status: raw.status as OutboxStatus,
    attempts: Number(raw.attempts ?? 0),
    lastError: (raw.last_error as string | null) ?? null,
    lastAttemptAt: (raw.last_attempt_at as number | null) ?? null,
    nextRetryAt: (raw.next_attempt_at as number | null) ?? null,
    createdAt: Number(raw.created_at),
    completedAt: (raw.completed_at as number | null) ?? null,
  };
}

// We store the discriminator inside body_json under `__outboxKind` so we can
// round-trip the OutboxKind across the existing schema without a column.
// Sealed kinds store `sealed` (the encrypted payload JSON) in place of `data`.
function wrapBody(
  kind: OutboxKind,
  payload: unknown,
  cipher?: OutboxPayloadCipher | null,
): string {
  if (SEALED_KINDS.has(kind) && payload != null) {
    if (cipher?.available()) {
      return JSON.stringify({ __outboxKind: kind, sealed: cipher.encrypt(JSON.stringify(payload)) });
    }
    return JSON.stringify({ __outboxKind: kind, data: stripImages(payload) });
  }
  return JSON.stringify({ __outboxKind: kind, data: payload });
}
function extractKindFromBody(payload: unknown): OutboxKind | null {
  if (
    payload &&
    typeof payload === 'object' &&
    '__outboxKind' in (payload as Record<string, unknown>)
  ) {
    return (payload as { __outboxKind: OutboxKind }).__outboxKind;
  }
  return null;
}
function stripInternalKind(payload: unknown): unknown {
  if (
    payload &&
    typeof payload === 'object' &&
    '__outboxKind' in (payload as Record<string, unknown>)
  ) {
    return (payload as { data: unknown }).data;
  }
  return payload;
}

export function createSqliteOutboxStore(
  db: DbHandle,
  cipher?: OutboxPayloadCipher | null,
  logger?: Logger,
): OutboxStore {
  const log = logger?.child({ svc: 'outbox-store' });
  if (!cipher) {
    log?.warn('outbox: no payload cipher, screenshot images will not be queued');
  }
  const parseRow = (raw: Record<string, unknown>) => parseRowWith(raw, cipher, log);
  return {
    insert(row: OutboxRow): void {
      db.prepare(
        `INSERT INTO sync_queue
         (id, created_at, method, path, body_json, status, attempts,
          last_error, next_attempt_at, last_attempt_at, completed_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        row.id,
        row.createdAt,
        row.method,
        row.path,
        wrapBody(row.kind, row.payload, cipher),
        row.status,
        row.attempts,
        row.lastError,
        row.nextRetryAt,
        row.lastAttemptAt,
        row.completedAt,
      );
    },
    findById(id: string): OutboxRow | null {
      const raw = db
        .prepare(`SELECT * FROM sync_queue WHERE id = ?`)
        .get(id) as Record<string, unknown> | undefined;
      return raw ? parseRow(raw) : null;
    },
    findClaimable(now: number, limit: number): OutboxRow[] {
      const rows = db
        .prepare(
          `SELECT * FROM sync_queue
            WHERE status = 'pending'
              AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
            ORDER BY created_at ASC
            LIMIT ?`,
        )
        .all(now, limit) as Record<string, unknown>[];
      return rows.map(parseRow);
    },
    update(row: OutboxRow): void {
      db.prepare(
        `UPDATE sync_queue
            SET status = ?, attempts = ?, last_error = ?,
                next_attempt_at = ?, last_attempt_at = ?, completed_at = ?
          WHERE id = ?`,
      ).run(
        row.status,
        row.attempts,
        row.lastError,
        row.nextRetryAt,
        row.lastAttemptAt,
        row.completedAt,
        row.id,
      );
      // Once the backend has the screenshot, the queued image is wiped:
      // nothing of it outlives the acknowledged upload.
      if (row.status === 'completed' && SEALED_KINDS.has(row.kind)) {
        db.prepare(`UPDATE sync_queue SET body_json = ? WHERE id = ?`).run(
          wrapBody(row.kind, null),
          row.id,
        );
      }
    },
    count(status: OutboxStatus): number {
      const r = db
        .prepare(`SELECT COUNT(*) AS n FROM sync_queue WHERE status = ?`)
        .get(status) as { n: number };
      return r?.n ?? 0;
    },
    oldestPendingCreatedAt(): number | null {
      const r = db
        .prepare(
          `SELECT MIN(created_at) AS c FROM sync_queue WHERE status = 'pending'`,
        )
        .get() as { c: number | null };
      return r?.c ?? null;
    },
    deleteCompletedBefore(cutoff: number): number {
      const res = db
        .prepare(
          `DELETE FROM sync_queue WHERE status = 'completed' AND completed_at IS NOT NULL AND completed_at < ?`,
        )
        .run(cutoff);
      return Number(res.changes ?? 0);
    },
    listDeadLetters(): OutboxRow[] {
      const rows = db
        .prepare(`SELECT * FROM sync_queue WHERE status = 'dead_letter' ORDER BY created_at ASC`)
        .all() as Record<string, unknown>[];
      return rows.map(parseRow);
    },
    resetInflight(): number {
      const res = db
        .prepare(`UPDATE sync_queue SET status = 'pending' WHERE status = 'inflight'`)
        .run();
      return Number(res.changes ?? 0);
    },
  };
}

// -----------------------------------------------------------------------------
// In-memory store (tests)
// -----------------------------------------------------------------------------

export function createInMemoryOutboxStore(): OutboxStore {
  const rows = new Map<string, OutboxRow>();
  return {
    insert(row: OutboxRow): void {
      rows.set(row.id, { ...row });
    },
    findById(id: string): OutboxRow | null {
      const r = rows.get(id);
      return r ? { ...r } : null;
    },
    findClaimable(now: number, limit: number): OutboxRow[] {
      return Array.from(rows.values())
        .filter(
          (r) =>
            r.status === 'pending' &&
            (r.nextRetryAt == null || r.nextRetryAt <= now),
        )
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, limit)
        .map((r) => ({ ...r }));
    },
    update(row: OutboxRow): void {
      if (!rows.has(row.id)) return;
      rows.set(row.id, { ...row });
    },
    count(status: OutboxStatus): number {
      let n = 0;
      for (const r of rows.values()) if (r.status === status) n++;
      return n;
    },
    oldestPendingCreatedAt(): number | null {
      let min: number | null = null;
      for (const r of rows.values()) {
        if (r.status !== 'pending') continue;
        if (min == null || r.createdAt < min) min = r.createdAt;
      }
      return min;
    },
    deleteCompletedBefore(cutoff: number): number {
      let n = 0;
      for (const [id, r] of rows.entries()) {
        if (
          r.status === 'completed' &&
          r.completedAt != null &&
          r.completedAt < cutoff
        ) {
          rows.delete(id);
          n++;
        }
      }
      return n;
    },
    listDeadLetters(): OutboxRow[] {
      return Array.from(rows.values())
        .filter((r) => r.status === 'dead_letter')
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((r) => ({ ...r }));
    },
    resetInflight(): number {
      let n = 0;
      for (const [id, r] of rows.entries()) {
        if (r.status === 'inflight') {
          rows.set(id, { ...r, status: 'pending' });
          n++;
        }
      }
      return n;
    },
    _all(): OutboxRow[] {
      return Array.from(rows.values()).map((r) => ({ ...r }));
    },
  };
}

// -----------------------------------------------------------------------------
// Outbox service factory
// -----------------------------------------------------------------------------

export interface OutboxDeps {
  store: OutboxStore;
  logger?: Logger;
  now?: () => number;
  /**
   * RNG returning [0, 1). Injectable so tests can produce deterministic
   * backoff values.
   */
  random?: () => number;
  /** Override the max attempts before dead-lettering (defaults to doc 16's 5). */
  maxAttempts?: number;
}

export type Outbox = ReturnType<typeof createOutbox>;

export function createOutbox(deps: OutboxDeps) {
  const log = deps.logger?.child({ svc: 'outbox' });
  const now = deps.now ?? Date.now;
  const rnd = deps.random ?? Math.random;
  const maxAttempts = deps.maxAttempts ?? MAX_ATTEMPTS;
  // While the gate is known closed, gated work waits until this time. In
  // memory only: after a restart the first gated row probes once and the hold
  // is set again (persisted rows keep their own next_attempt_at meanwhile).
  let verificationHoldUntil = 0;

  function newId(): string {
    const u = randomUUID().replace(/-/g, '');
    return `req_${u.slice(0, 24)}`;
  }

  function computeNextRetry(attempts: number): number {
    const exp = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, attempts));
    const jitter = rnd() * exp;
    return now() + Math.floor(jitter);
  }

  function enqueue(input: OutboxEnqueueInput): OutboxRow {
    const id = input.id ?? newId();
    // Idempotency: if a row with this id already exists, return it
    // unchanged. Callers get "enqueued exactly once" semantics for free.
    const existing = deps.store.findById(id);
    if (existing) {
      log?.debug({ id, kind: existing.kind }, 'outbox: enqueue idempotent hit');
      return existing;
    }
    const row: OutboxRow = {
      id,
      kind: input.kind,
      method: input.method,
      path: input.path,
      payload: input.payload,
      status: 'pending',
      attempts: 0,
      lastError: null,
      lastAttemptAt: null,
      nextRetryAt: null,
      createdAt: now(),
      completedAt: null,
    };
    // New gated work queued while the gate is closed waits with the rest, so
    // it neither probes the gate on its own nor overtakes older rows.
    if (VERIFICATION_GATED_KINDS.has(input.kind) && verificationHoldUntil > now()) {
      row.nextRetryAt = verificationHoldUntil;
    }
    deps.store.insert(row);
    log?.debug({ id, kind: input.kind, path: input.path }, 'outbox: enqueued');
    return row;
  }

  function claimNext(batchSize = 10): OutboxRow[] {
    const claimable = deps.store.findClaimable(now(), batchSize);
    const claimed: OutboxRow[] = [];
    for (const row of claimable) {
      const next: OutboxRow = {
        ...row,
        status: 'inflight',
        lastAttemptAt: now(),
      };
      deps.store.update(next);
      claimed.push(next);
    }
    return claimed;
  }

  function markDone(id: string): void {
    const row = deps.store.findById(id);
    if (!row) return;
    const next: OutboxRow = {
      ...row,
      status: 'completed',
      completedAt: now(),
      lastError: null,
      nextRetryAt: null,
    };
    deps.store.update(next);
    log?.debug({ id, kind: row.kind }, 'outbox: marked done');
  }

  function markFailed(
    id: string,
    error: string,
    options: { retryable: boolean; transient?: boolean },
  ): OutboxRow | null {
    const row = deps.store.findById(id);
    if (!row) return null;
    // Transient = the request never got an HTTP response (connection refused,
    // DNS failure, timeout): the device is offline, not the request bad. It
    // goes back to pending without spending an attempt, so an outage of any
    // length never dead-letters queued work — it uploads once back online.
    if (options.transient) {
      const next: OutboxRow = {
        ...row,
        status: 'pending',
        lastError: error,
        lastAttemptAt: now(),
        nextRetryAt: now() + TRANSIENT_RETRY_MS + Math.floor(rnd() * TRANSIENT_RETRY_MS),
      };
      deps.store.update(next);
      log?.debug({ id, kind: row.kind }, 'outbox: transient failure, will retry');
      return next;
    }
    const attempts = row.attempts + 1;
    // Non-retryable 4xx -> dead letter immediately.
    if (!options.retryable) {
      const next: OutboxRow = {
        ...row,
        status: 'dead_letter',
        attempts,
        lastError: error,
        lastAttemptAt: now(),
        nextRetryAt: null,
      };
      deps.store.update(next);
      log?.warn(
        { id, kind: row.kind, error },
        'outbox: dead-letter (non-retryable)',
      );
      return next;
    }
    // Retryable but exceeded attempts.
    if (attempts >= maxAttempts) {
      const next: OutboxRow = {
        ...row,
        status: 'dead_letter',
        attempts,
        lastError: error,
        lastAttemptAt: now(),
        nextRetryAt: null,
      };
      deps.store.update(next);
      log?.warn(
        { id, kind: row.kind, attempts, error },
        'outbox: dead-letter (max attempts)',
      );
      return next;
    }
    const next: OutboxRow = {
      ...row,
      status: 'pending',
      attempts,
      lastError: error,
      lastAttemptAt: now(),
      nextRetryAt: computeNextRetry(attempts),
    };
    deps.store.update(next);
    log?.debug(
      { id, kind: row.kind, attempts, nextRetryAt: next.nextRetryAt },
      'outbox: scheduled retry',
    );
    return next;
  }

  /**
   * The gate answered 403 VERIFICATION_REQUIRED for this row. Keeps the row
   * (payload and idempotency key untouched) as pending WITHOUT spending an
   * attempt, and holds every waiting gated row until one shared retry time, so
   * the queue produces a single probe per interval and keeps its order.
   */
  function holdForVerification(id: string, error: string): OutboxRow | null {
    const row = deps.store.findById(id);
    if (!row) return null;
    const retryAt = now() + VERIFICATION_RETRY_MS + Math.floor(rnd() * VERIFICATION_RETRY_MS);
    verificationHoldUntil = retryAt;
    const next: OutboxRow = {
      ...row,
      status: 'pending',
      lastError: error,
      lastAttemptAt: now(),
      nextRetryAt: retryAt,
    };
    deps.store.update(next);
    for (const other of deps.store.findClaimable(now(), Number.MAX_SAFE_INTEGER)) {
      if (!VERIFICATION_GATED_KINDS.has(other.kind)) continue;
      deps.store.update({ ...other, nextRetryAt: retryAt });
    }
    log?.info({ id, kind: row.kind, retryAt }, 'outbox: verification required, holding gated work');
    return next;
  }

  /** Puts a claimed-but-unsent gated row back under the current hold, without a request or an attempt. */
  function releaseToVerificationHold(id: string): void {
    const row = deps.store.findById(id);
    if (!row || row.status !== 'inflight') return;
    deps.store.update({ ...row, status: 'pending', nextRetryAt: verificationHoldUntil });
  }

  /** The gate answered for a gated row, so any hold on its kind is over. */
  function clearVerificationHold(): void {
    verificationHoldUntil = 0;
  }

  /** Resets a dead-lettered row to pending (used by DiagnosticsScreen retry). */
  function requeueDeadLetter(id: string): OutboxRow | null {
    const row = deps.store.findById(id);
    if (!row || row.status !== 'dead_letter') return row;
    const next: OutboxRow = {
      ...row,
      status: 'pending',
      attempts: 0,
      lastError: null,
      nextRetryAt: null,
    };
    deps.store.update(next);
    return next;
  }

  /**
   * Requeues dead letters that died from network failures (anything not
   * recorded as an `HTTP <status>` error) — work dropped by an outage before
   * transient failures stopped counting as attempts. Real HTTP rejections
   * (4xx, repeated 5xx) stay dead. Returns how many were requeued.
   */
  function requeueNetworkDeadLetters(): number {
    let n = 0;
    for (const row of deps.store.listDeadLetters()) {
      if (row.lastError?.startsWith('HTTP ')) continue;
      requeueDeadLetter(row.id);
      n++;
    }
    if (n > 0) log?.info({ n }, 'outbox: requeued network dead letters');
    return n;
  }

  function stats(): OutboxStats {
    return {
      pending: deps.store.count('pending'),
      inflight: deps.store.count('inflight'),
      completed: deps.store.count('completed'),
      deadLetter: deps.store.count('dead_letter'),
      oldestPendingCreatedAt: deps.store.oldestPendingCreatedAt(),
    };
  }

  /**
   * Called once at launch, before the sync worker starts. A row is only
   * 'inflight' while a request for it is open; if the app quit (or was
   * killed) mid-request, the row is left 'inflight' and claimNext() would
   * never pick it up again. Every row carries its id as the request's
   * Idempotency-Key, so resending one the server already got is safe.
   */
  function recoverInflight(): number {
    const n = deps.store.resetInflight();
    if (n > 0) log?.info({ n }, 'outbox: recovered inflight rows from last run');
    return n;
  }

  function purgeDone(olderThanMs: number): number {
    const cutoff = now() - olderThanMs;
    const n = deps.store.deleteCompletedBefore(cutoff);
    if (n > 0) log?.debug({ n, cutoff }, 'outbox: purged completed');
    return n;
  }

  function findById(id: string): OutboxRow | null {
    return deps.store.findById(id);
  }

  return {
    enqueue,
    claimNext,
    markDone,
    markFailed,
    holdForVerification,
    releaseToVerificationHold,
    clearVerificationHold,
    requeueDeadLetter,
    requeueNetworkDeadLetters,
    stats,
    recoverInflight,
    purgeDone,
    findById,
    // exposed so the worker can compute idempotency keys in the same space
    newId,
  };
}

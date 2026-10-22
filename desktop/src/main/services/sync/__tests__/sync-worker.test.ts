// src/main/services/sync/__tests__/sync-worker.test.ts
//
// Offline-first sync: work queued while the network is down must upload once
// it is back — never dropped. Uses the in-memory outbox and a fake network /
// api so no Electron, axios network or SQLite is involved.

import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { AxiosError } from 'axios';
import {
  createInMemoryOutboxStore,
  createOutbox,
  MAX_ATTEMPTS,
  VERIFICATION_RETRY_MS,
  type OutboxStore,
} from '../outbox';
import { createSyncWorker, isGateUnavailable, isVerificationRequired } from '../sync-worker';
import type { ApiClient } from '../api-client';
import type { NetworkMonitor, NetworkStateDetail } from '../network-monitor';

function makeNetwork(detail: NetworkStateDetail) {
  const bus = new EventEmitter();
  const net = {
    detail,
    get online() {
      return net.detail !== 'Offline';
    },
    on: (e: string, l: (...a: unknown[]) => void) => bus.on(e, l),
    off: (e: string, l: (...a: unknown[]) => void) => bus.off(e, l),
    set(next: NetworkStateDetail) {
      const was = net.online;
      net.detail = next;
      if (was !== net.online) bus.emit('net:online-changed', net.online);
    },
  };
  return net;
}

type Responder = () => Promise<{ status: number; data?: unknown }>;

function makeWorker(opts: {
  detail: NetworkStateDetail
  respond: Responder
  /** Share a store (and clock) to simulate an application restart. */
  store?: OutboxStore
  clock?: { now: number }
  random?: () => number
}) {
  const clock = opts.clock ?? { now: 1_000_000 };
  const outbox = createOutbox({
    store: opts.store ?? createInMemoryOutboxStore(),
    now: () => clock.now,
    random: opts.random ?? (() => 0),
  });
  const raw = vi.fn(opts.respond);
  const api = { raw } as unknown as ApiClient;
  const network = makeNetwork(opts.detail);
  const worker = createSyncWorker({ api, outbox, network: network as unknown as NetworkMonitor });
  const enqueue = () =>
    outbox.enqueue({ kind: 'screenshot.confirm', method: 'POST', path: '/screenshots/confirm', payload: {} });
  /** Moves past any retry delay and runs one drain. */
  const tick = async () => {
    clock.now += 60_000;
    await worker.forceRun();
  };
  return { outbox, raw, network, worker, enqueue, tick, clock };
}

const ok: Responder = async () => ({ status: 201, data: {} });
const refused: Responder = async () => {
  throw new AxiosError('connect ECONNREFUSED 127.0.0.1:4000', 'ECONNREFUSED');
};

describe('sync-worker — offline-first', () => {
  it('sends nothing while Degraded or Offline (doc 16 §4), then sends once Online', async () => {
    const w = makeWorker({ detail: 'Degraded', respond: ok });
    w.enqueue();
    await w.tick();
    w.network.set('Offline');
    await w.tick();
    expect(w.raw).not.toHaveBeenCalled();

    w.network.set('Online');
    await w.tick();
    expect(w.raw).toHaveBeenCalledTimes(1);
    expect(w.outbox.stats().pending).toBe(0);
    expect(w.outbox.stats().completed).toBe(1);
  });

  it('a no-response (network) failure never dead-letters, and uploads once it recovers', async () => {
    let respond: Responder = refused;
    const w = makeWorker({ detail: 'Online', respond: () => respond() });
    const row = w.enqueue();

    for (let i = 0; i < MAX_ATTEMPTS * 4; i++) await w.tick();
    expect(w.outbox.findById(row.id)).toMatchObject({ status: 'pending', attempts: 0 });
    expect(w.outbox.stats().deadLetter).toBe(0);

    respond = ok;
    await w.tick();
    expect(w.outbox.findById(row.id)!.status).toBe('completed');
  });

  it('server errors are unchanged: 500 dead-letters after MAX_ATTEMPTS, 400 at once', async () => {
    const w500 = makeWorker({ detail: 'Online', respond: async () => ({ status: 500 }) });
    const a = w500.enqueue();
    for (let i = 0; i < MAX_ATTEMPTS; i++) await w500.tick();
    expect(w500.outbox.findById(a.id)!.status).toBe('dead_letter');

    const w400 = makeWorker({ detail: 'Online', respond: async () => ({ status: 400 }) });
    const b = w400.enqueue();
    await w400.tick();
    expect(w400.outbox.findById(b.id)!.status).toBe('dead_letter');
  });

  it('409 "Duplicate key" is done (server already has it); any other 409 still dead-letters', async () => {
    const dup = makeWorker({ detail: 'Online', respond: async () => ({ status: 409, data: { message: 'Duplicate key' } }) });
    const a = dup.enqueue();
    await dup.tick();
    expect(dup.outbox.findById(a.id)!.status).toBe('completed');

    const other = makeWorker({ detail: 'Online', respond: async () => ({ status: 409, data: { message: 'Task exists' } }) });
    const b = other.enqueue();
    await other.tick();
    expect(other.outbox.findById(b.id)!.status).toBe('dead_letter');
  });

  it('on reconnect, work an earlier outage dead-lettered is requeued and uploaded', async () => {
    const w = makeWorker({ detail: 'Offline', respond: ok });
    const lost = w.enqueue();
    const rejected = w.enqueue();
    // State left behind by the old rule: network failures spent all attempts.
    for (let i = 0; i < MAX_ATTEMPTS; i++) w.outbox.markFailed(lost.id, '', { retryable: true });
    w.outbox.markFailed(rejected.id, 'HTTP 422', { retryable: false });

    w.worker.start();
    w.network.set('Online');
    await w.tick();
    await w.worker.stop();

    expect(w.outbox.findById(lost.id)!.status).toBe('completed');
    expect(w.outbox.findById(rejected.id)!.status).toBe('dead_letter');
  });
});

// -----------------------------------------------------------------------------
// G8: the server refuses Time Tracker writes (and saves nothing) when it cannot
// confirm the talent's verification status. That is an outage, not a verdict.
// -----------------------------------------------------------------------------

const GATE_UNAVAILABLE = {
  success: false,
  error: 'IDENTITY_VERIFICATION_UNAVAILABLE',
  message: "We couldn't confirm your verification status. Please try again shortly.",
};
const gateUnavailable: Responder = async () => ({ status: 503, data: GATE_UNAVAILABLE });
const gateClosed: Responder = async () => ({
  status: 403,
  data: { success: false, error: 'VERIFICATION_REQUIRED', message: 'Verify your account to continue.', missingRequirements: 'identity' },
});

describe('sync-worker - G8 gate outage (identity-verification-service briefly unreachable)', () => {
  it('a gate outage never spends an attempt or dead-letters, however long it lasts', async () => {
    const w = makeWorker({ detail: 'Online', respond: gateUnavailable });
    const row = w.enqueue();

    for (let i = 0; i < MAX_ATTEMPTS * 4; i++) await w.tick();

    expect(w.outbox.findById(row.id)).toMatchObject({ status: 'pending', attempts: 0 });
    expect(w.outbox.stats().deadLetter).toBe(0);
    expect(w.raw.mock.calls.length).toBeGreaterThan(MAX_ATTEMPTS);
  });

  it('the same upload is retried with the same idempotency key and lands once the gate answers', async () => {
    let respond: Responder = gateUnavailable;
    const w = makeWorker({ detail: 'Online', respond: () => respond() });
    const row = w.enqueue();
    for (let i = 0; i < MAX_ATTEMPTS * 2; i++) await w.tick();
    expect(w.outbox.findById(row.id)!.status).toBe('pending');

    respond = ok;
    await w.tick();

    expect(w.outbox.findById(row.id)!.status).toBe('completed');
    expect(w.outbox.stats().completed).toBe(1);
    const keys = new Set(w.raw.mock.calls.map((c) => (c[0] as { idempotencyKey: string }).idempotencyKey));
    expect([...keys]).toEqual([row.id]);
    // A completed row is not sent again.
    const callsBefore = w.raw.mock.calls.length;
    await w.tick();
    expect(w.raw.mock.calls.length).toBe(callsBefore);
  });

  it('the queued payload survives the whole outage untouched', async () => {
    const w = makeWorker({ detail: 'Online', respond: gateUnavailable });
    const payload = { sessionId: 's-1', startedAt: '2026-10-16T09:00:00Z', idempotencyKey: 'k-1' };
    const row = w.outbox.enqueue({ kind: 'time-entry.create', method: 'POST', path: '/time-entries', payload });
    for (let i = 0; i < MAX_ATTEMPTS * 3; i++) await w.tick();
    expect(w.outbox.findById(row.id)!.payload).toEqual(payload);
  });

  it('recognises the gate code however the gateway wraps it, and nothing else', () => {
    expect(isGateUnavailable(GATE_UNAVAILABLE)).toBe(true);
    expect(isGateUnavailable({ error: { code: 'IDENTITY_VERIFICATION_UNAVAILABLE' } })).toBe(true);
    expect(isGateUnavailable({ statusCode: 503, message: GATE_UNAVAILABLE })).toBe(true);
    expect(isGateUnavailable({ code: 'IDENTITY_VERIFICATION_UNAVAILABLE' })).toBe(true);
    expect(isGateUnavailable({ message: 'Service Unavailable' })).toBe(false);
    expect(isGateUnavailable(undefined)).toBe(false);
    expect(isGateUnavailable('IDENTITY_VERIFICATION_UNAVAILABLE_NOT')).toBe(false);
  });

  it('a 503 that is not the gate outage still spends attempts and dead-letters after MAX_ATTEMPTS', async () => {
    const w = makeWorker({ detail: 'Online', respond: async () => ({ status: 503, data: { message: 'Service Unavailable' } }) });
    const row = w.enqueue();
    for (let i = 0; i < MAX_ATTEMPTS; i++) await w.tick();
    expect(w.outbox.findById(row.id)!.status).toBe('dead_letter');
  });

  it('a gate outage only on 503: the same body on another status is not treated as an outage', async () => {
    const w = makeWorker({ detail: 'Online', respond: async () => ({ status: 400, data: GATE_UNAVAILABLE }) });
    const row = w.enqueue();
    await w.tick();
    expect(w.outbox.findById(row.id)!.status).toBe('dead_letter');
  });

  it('duplicate delivery: a write the server saved but never confirmed is done on replay, not duplicated', async () => {
    // First attempt reaches the server, which saves it, but the reply is lost; the retry
    // carries the same key and the server answers 409 "Duplicate key".
    const replies: Responder[] = [refused, async () => ({ status: 409, data: { message: 'Duplicate key' } })];
    const w = makeWorker({ detail: 'Online', respond: () => (replies.shift() ?? ok)() });
    const row = w.enqueue();
    await w.tick();
    await w.tick();
    expect(w.outbox.findById(row.id)!.status).toBe('completed');
    expect(w.outbox.stats().deadLetter).toBe(0);
    expect(w.raw).toHaveBeenCalledTimes(2);
    const keys = w.raw.mock.calls.map((c) => (c[0] as { idempotencyKey: string }).idempotencyKey);
    expect(new Set(keys).size).toBe(1);
  });
})

// -----------------------------------------------------------------------------
// G8 (Christopher's confirmed rule): offline time rejected with 403
// VERIFICATION_REQUIRED is KEPT and synchronizes automatically, exactly once,
// after the talent verifies again. It never dead-letters or spends attempts.
// -----------------------------------------------------------------------------

const keyOf = (c: unknown[]) => (c[0] as { idempotencyKey: string }).idempotencyKey;
const sessionStart = (outbox: ReturnType<typeof makeWorker>['outbox'], payload: unknown, id?: string) =>
  outbox.enqueue({ kind: 'session.start', method: 'POST', path: '/sessions', payload, id });

describe('sync-worker - G8 closed gate (403 VERIFICATION_REQUIRED)', () => {
  it('repeated 403s keep the row: no attempt spent, never dead-lettered, payload and key untouched', async () => {
    const w = makeWorker({ detail: 'Online', respond: gateClosed });
    const payload = { sessionId: 's-2', startedAt: '2026-10-16T09:00:00Z' };
    const row = sessionStart(w.outbox, payload, 'req_fixed_key');

    for (let i = 0; i < MAX_ATTEMPTS * 6; i++) await w.tick();

    expect(w.outbox.findById(row.id)).toMatchObject({
      id: 'req_fixed_key',
      status: 'pending',
      attempts: 0,
      payload,
      lastError: 'HTTP 403 VERIFICATION_REQUIRED',
    });
    expect(w.outbox.stats().deadLetter).toBe(0);
    expect(w.raw.mock.calls.length).toBeGreaterThan(1);
    expect(new Set(w.raw.mock.calls.map(keyOf))).toEqual(new Set(['req_fixed_key']));
  });

  it('retries slowly: never sooner than the bounded interval, so a closed gate sees almost no traffic', async () => {
    const w = makeWorker({ detail: 'Online', respond: gateClosed });
    sessionStart(w.outbox, {});
    const callTimes: number[] = [];
    w.raw.mockImplementation(async () => {
      callTimes.push(w.clock.now);
      return gateClosed();
    });

    // One hour of 5-second poll ticks.
    for (let i = 0; i < 720; i++) {
      w.clock.now += 5_000;
      await w.worker.forceRun();
    }

    expect(callTimes.length).toBeGreaterThan(3);
    expect(callTimes.length).toBeLessThanOrEqual(Math.ceil((60 * 60_000) / VERIFICATION_RETRY_MS) + 1);
    for (let i = 1; i < callTimes.length; i++) {
      expect(callTimes[i] - callTimes[i - 1]).toBeGreaterThanOrEqual(VERIFICATION_RETRY_MS);
    }
  });

  it('the retry delay is jittered and bounded between 1x and 2x the interval', async () => {
    for (const [random, expected] of [
      [() => 0, VERIFICATION_RETRY_MS],
      [() => 0.5, VERIFICATION_RETRY_MS * 1.5],
      [() => 0.999999, VERIFICATION_RETRY_MS * 2],
    ] as const) {
      const w = makeWorker({ detail: 'Online', respond: gateClosed, random });
      const row = sessionStart(w.outbox, {});
      const before = w.clock.now;
      await w.worker.forceRun();
      const next = w.outbox.findById(row.id)!.nextRetryAt!;
      expect(next - before).toBeGreaterThanOrEqual(VERIFICATION_RETRY_MS);
      expect(next - before).toBeLessThanOrEqual(VERIFICATION_RETRY_MS * 2);
      expect(Math.abs(next - before - expected)).toBeLessThan(10);
    }
  });

  it('eventual verification: the queued work synchronizes once, with the original payload and key', async () => {
    let respond: Responder = gateClosed;
    const w = makeWorker({ detail: 'Online', respond: () => respond() });
    const payload = { sessionId: 's-3', note: 'worked offline' };
    const row = sessionStart(w.outbox, payload);
    for (let i = 0; i < 12; i++) await w.tick();
    expect(w.outbox.findById(row.id)!.status).toBe('pending');

    respond = ok;
    for (let i = 0; i < 12; i++) await w.tick();

    expect(w.outbox.findById(row.id)).toMatchObject({ status: 'completed', payload });
    const calls = w.raw.mock.calls;
    const accepted = calls.filter((c) => keyOf(c) === row.id);
    expect(accepted.length).toBe(calls.length);
    expect((calls[calls.length - 1][0] as { body: unknown }).body).toEqual(payload);
    // It is sent once more only if the server answered ok, and never again after.
    const callsAfterDone = calls.length;
    for (let i = 0; i < 5; i++) await w.tick();
    expect(w.raw.mock.calls.length).toBe(callsAfterDone);
  });

  it('application restart: the held row survives, stays quiet until its retry time, then syncs', async () => {
    const store = createInMemoryOutboxStore();
    const clock = { now: 5_000_000 };
    const first = makeWorker({ detail: 'Online', respond: gateClosed, store, clock });
    const payload = { sessionId: 's-4' };
    const row = sessionStart(first.outbox, payload);
    await first.worker.forceRun();
    expect(first.raw).toHaveBeenCalledTimes(1);
    await first.worker.stop();

    // "Restart": a brand-new outbox and worker over the same persisted rows,
    // with the gate now open.
    const second = makeWorker({ detail: 'Online', respond: ok, store, clock });
    second.worker.start();
    await second.worker.forceRun();
    clock.now += VERIFICATION_RETRY_MS - 1_000;
    await second.worker.forceRun();
    expect(second.raw).not.toHaveBeenCalled(); // not before its retry time
    expect(second.outbox.findById(row.id)).toMatchObject({ status: 'pending', attempts: 0, payload });

    clock.now += 2_000;
    await second.worker.forceRun();
    expect(second.raw).toHaveBeenCalledTimes(1);
    expect(keyOf(second.raw.mock.calls[0])).toBe(row.id);
    expect(second.outbox.findById(row.id)!.status).toBe('completed');
    await second.worker.stop();
  });

  it('duplicate prevention: a backlog sends one probe while closed, then each row exactly once, oldest first', async () => {
    let respond: Responder = gateClosed;
    const w = makeWorker({ detail: 'Online', respond: () => respond() });
    const ids = ['req_a', 'req_b', 'req_c'].map((id) => sessionStart(w.outbox, { id }, id).id);
    w.clock.now += 1; // distinct created_at ordering is by insert time; keep it stable

    await w.worker.forceRun();
    expect(w.raw).toHaveBeenCalledTimes(1); // the rest of the backlog waits with no request
    expect(ids.every((id) => w.outbox.findById(id)!.status === 'pending')).toBe(true);

    // Work queued while the gate is closed waits too: it does not probe on its own.
    const late = sessionStart(w.outbox, { id: 'late' }, 'req_late');
    await w.worker.forceRun();
    expect(w.raw).toHaveBeenCalledTimes(1);
    expect(late.nextRetryAt).not.toBeNull();

    respond = ok;
    w.raw.mockClear();
    w.clock.now += VERIFICATION_RETRY_MS * 2 + 1_000;
    // Two overlapping drains must not double-send.
    await Promise.all([w.worker.forceRun(), w.worker.forceRun()]);
    await w.worker.forceRun();

    const sent = w.raw.mock.calls.map(keyOf);
    expect(sent).toEqual(['req_a', 'req_b', 'req_c', 'req_late']);
    expect(w.outbox.stats()).toMatchObject({ pending: 0, inflight: 0, deadLetter: 0, completed: 4 });
  });

  it('un-gated work is not held back by a closed gate', async () => {
    const w = makeWorker({
      detail: 'Online',
      respond: async () => gateClosed(),
    });
    const calls: string[] = [];
    w.raw.mockImplementation(async (req: unknown) => {
      const r = req as { path: string };
      calls.push(r.path);
      return r.path === '/sessions' ? gateClosed() : ok();
    });
    sessionStart(w.outbox, {});
    w.outbox.enqueue({ kind: 'screenshot.confirm', method: 'POST', path: '/screenshots/confirm', payload: {} });
    w.outbox.enqueue({ kind: 'activity.batch', method: 'POST', path: '/activity/batch', payload: {} });
    await w.worker.forceRun();
    expect(calls.sort()).toEqual(['/activity/batch', '/screenshots/confirm', '/sessions']);
    expect(w.outbox.stats()).toMatchObject({ completed: 2, pending: 1, deadLetter: 0 });
  });

  it('ordinary 403s keep their existing behavior: dead-lettered at once, never held', async () => {
    for (const data of [
      undefined,
      {},
      { error: 'FORBIDDEN' },
      { message: 'Forbidden resource' },
      { error: 'SOMETHING_ELSE', message: 'Verify your account to continue.' },
    ]) {
      const w = makeWorker({ detail: 'Online', respond: async () => ({ status: 403, data }) });
      const row = sessionStart(w.outbox, { n: 1 });
      await w.tick();
      expect(w.outbox.findById(row.id)).toMatchObject({ status: 'dead_letter', attempts: 1, lastError: 'HTTP 403' });
      const calls = w.raw.mock.calls.length;
      await w.tick();
      expect(w.raw.mock.calls.length).toBe(calls);
    }
  });

  it('the verification code only counts on a 403 (the same body on 400 or 500 keeps existing behavior)', async () => {
    const body = { error: 'VERIFICATION_REQUIRED' };
    const w400 = makeWorker({ detail: 'Online', respond: async () => ({ status: 400, data: body }) });
    const r400 = sessionStart(w400.outbox, {});
    await w400.tick();
    expect(w400.outbox.findById(r400.id)!.status).toBe('dead_letter');

    const w500 = makeWorker({ detail: 'Online', respond: async () => ({ status: 500, data: body }) });
    const r500 = sessionStart(w500.outbox, {});
    await w500.tick();
    // Existing 5xx behavior: attempts are spent and it dead-letters at MAX_ATTEMPTS, never held.
    expect(w500.outbox.findById(r500.id)).toMatchObject({ status: 'dead_letter', attempts: MAX_ATTEMPTS });
  });

  it('the gate-outage 503 is unchanged by the closed-gate rule: no hold, short transient retry, no attempt spent', async () => {
    const w = makeWorker({ detail: 'Online', respond: gateUnavailable });
    const row = sessionStart(w.outbox, {});
    const before = w.clock.now;
    await w.worker.forceRun();
    const stored = w.outbox.findById(row.id)!;
    expect(stored).toMatchObject({ status: 'pending', attempts: 0 });
    expect(stored.nextRetryAt! - before).toBeLessThan(VERIFICATION_RETRY_MS);
    // A second gated row is NOT held by an outage: it is still dispatched.
    const second = sessionStart(w.outbox, {}, 'req_second');
    w.raw.mockClear();
    await w.worker.forceRun();
    expect(second.nextRetryAt).toBeNull();
  });

  it('recognises the verification code however the gateway wraps it, and nothing else', () => {
    const body = { success: false, error: 'VERIFICATION_REQUIRED', message: 'Verify your account to continue.' };
    expect(isVerificationRequired(body)).toBe(true);
    expect(isVerificationRequired({ error: { code: 'VERIFICATION_REQUIRED' } })).toBe(true);
    expect(isVerificationRequired({ statusCode: 403, message: body })).toBe(true);
    expect(isVerificationRequired({ message: 'Verify your account to continue.' })).toBe(false);
    expect(isVerificationRequired({ error: 'IDENTITY_VERIFICATION_UNAVAILABLE' })).toBe(false);
    expect(isVerificationRequired(undefined)).toBe(false);
    expect(isVerificationRequired('VERIFICATION_REQUIRED_NOT')).toBe(false);
  });
});

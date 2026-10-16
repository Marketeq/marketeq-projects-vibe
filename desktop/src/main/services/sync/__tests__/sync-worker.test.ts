// src/main/services/sync/__tests__/sync-worker.test.ts
//
// Offline-first sync: work queued while the network is down must upload once
// it is back — never dropped. Uses the in-memory outbox and a fake network /
// api so no Electron, axios network or SQLite is involved.

import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { AxiosError } from 'axios';
import { createInMemoryOutboxStore, createOutbox, MAX_ATTEMPTS } from '../outbox';
import { createSyncWorker, isGateUnavailable } from '../sync-worker';
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

function makeWorker(opts: { detail: NetworkStateDetail; respond: Responder }) {
  const clock = { now: 1_000_000 };
  const outbox = createOutbox({ store: createInMemoryOutboxStore(), now: () => clock.now, random: () => 0 });
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
  return { outbox, raw, network, worker, enqueue, tick };
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

  it('closed gate stays closed: 403 VERIFICATION_REQUIRED is not retried as an outage, but the row is kept and can be requeued', async () => {
    let respond: Responder = gateClosed;
    const w = makeWorker({ detail: 'Online', respond: () => respond() });
    const payload = { sessionId: 's-2' };
    const row = w.outbox.enqueue({ kind: 'time-entry.create', method: 'POST', path: '/time-entries', payload });

    await w.tick();
    expect(w.outbox.findById(row.id)).toMatchObject({ status: 'dead_letter', payload });
    const calls = w.raw.mock.calls.length;
    await w.tick();
    expect(w.raw.mock.calls.length).toBe(calls); // not hammering a closed gate

    // The talent verifies; the parked work is requeued (Diagnostics retry) and uploads.
    respond = ok;
    w.outbox.requeueDeadLetter(row.id);
    await w.tick();
    expect(w.outbox.findById(row.id)!.status).toBe('completed');
  });
});

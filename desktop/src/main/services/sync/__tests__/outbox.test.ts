// src/main/services/sync/__tests__/outbox.test.ts
//
// Phase 4 — Pure unit tests for the outbox. Runs against the in-memory
// store so no better-sqlite3 / Electron dependency is required. Covers
// enqueue idempotency, FIFO claim ordering, retry backoff bookkeeping,
// and dead-letter transitions.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInMemoryOutboxStore,
  createOutbox,
  MAX_ATTEMPTS,
  type OutboxRow,
  type OutboxStore,
  type Outbox,
} from '../outbox';

function makeOutbox(nowRef: { value: number }): {
  store: OutboxStore;
  outbox: Outbox;
} {
  const store = createInMemoryOutboxStore();
  const outbox = createOutbox({
    store,
    now: () => nowRef.value,
    // Deterministic "random": always 0 so nextRetryAt = now.
    random: () => 0,
  });
  return { store, outbox };
}

describe('outbox', () => {
  let nowRef: { value: number };
  let outbox: Outbox;
  let store: OutboxStore;

  beforeEach(() => {
    nowRef = { value: 1_000_000 };
    const built = makeOutbox(nowRef);
    outbox = built.outbox;
    store = built.store;
  });

  it('enqueue inserts a pending row with the correct defaults', () => {
    const row = outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/sessions',
      payload: { foo: 'bar' },
    });
    expect(row.status).toBe('pending');
    expect(row.attempts).toBe(0);
    expect(row.createdAt).toBe(1_000_000);
    expect(row.lastAttemptAt).toBeNull();
    expect(row.nextRetryAt).toBeNull();
    expect(row.lastError).toBeNull();
    expect(row.id.startsWith('req_')).toBe(true);
  });

  it('enqueue with an explicit id is idempotent', () => {
    const first = outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/sessions',
      payload: { a: 1 },
      id: 'req_fixed',
    });
    nowRef.value += 5000;
    const second = outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/sessions',
      payload: { a: 2 }, // intentionally different payload
      id: 'req_fixed',
    });
    expect(second.id).toBe(first.id);
    // second payload should be ignored — idempotent insert returns the existing row
    expect((second.payload as { a: number }).a).toBe(1);
    const all = store._all?.() ?? [];
    expect(all.length).toBe(1);
  });

  it('claimNext returns rows in FIFO order and marks them inflight', () => {
    outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/sessions',
      payload: { n: 1 },
    });
    nowRef.value++;
    outbox.enqueue({
      kind: 'time-entry.create',
      method: 'POST',
      path: '/entries',
      payload: { n: 2 },
    });
    nowRef.value++;
    outbox.enqueue({
      kind: 'activity.batch',
      method: 'POST',
      path: '/activity',
      payload: { n: 3 },
    });

    const batch = outbox.claimNext(10);
    expect(batch.length).toBe(3);
    expect((batch[0]!.payload as { n: number }).n).toBe(1);
    expect((batch[1]!.payload as { n: number }).n).toBe(2);
    expect((batch[2]!.payload as { n: number }).n).toBe(3);
    for (const r of batch) expect(r.status).toBe('inflight');
  });

  it('markDone flips status to completed and sets completedAt', () => {
    const row = outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/sessions',
      payload: {},
    });
    outbox.claimNext(1);
    nowRef.value = 2_000_000;
    outbox.markDone(row.id);
    const fresh = outbox.findById(row.id)!;
    expect(fresh.status).toBe('completed');
    expect(fresh.completedAt).toBe(2_000_000);
  });

  it('markFailed with retryable schedules a retry with bounded backoff', () => {
    const row = outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/sessions',
      payload: {},
    });
    outbox.claimNext(1);
    outbox.markFailed(row.id, 'HTTP 503', { retryable: true });
    const fresh = outbox.findById(row.id)!;
    expect(fresh.status).toBe('pending');
    expect(fresh.attempts).toBe(1);
    expect(fresh.lastError).toBe('HTTP 503');
    // random: () => 0 → nextRetryAt === now
    expect(fresh.nextRetryAt).toBe(1_000_000);
  });

  it('markFailed with non-retryable dead-letters immediately', () => {
    const row = outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/sessions',
      payload: {},
    });
    outbox.claimNext(1);
    outbox.markFailed(row.id, 'HTTP 422', { retryable: false });
    const fresh = outbox.findById(row.id)!;
    expect(fresh.status).toBe('dead_letter');
    expect(fresh.attempts).toBe(1);
    expect(fresh.lastError).toBe('HTTP 422');
  });

  it('markFailed dead-letters after MAX_ATTEMPTS retries', () => {
    const row = outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/sessions',
      payload: {},
    });
    // Simulate MAX_ATTEMPTS consecutive retryable failures.
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      outbox.claimNext(1);
      outbox.markFailed(row.id, `fail ${i}`, { retryable: true });
    }
    const fresh = outbox.findById(row.id)!;
    expect(fresh.status).toBe('dead_letter');
    expect(fresh.attempts).toBe(MAX_ATTEMPTS);
  });

  it('claimNext respects nextRetryAt backoff', () => {
    nowRef.value = 1_000_000;
    const row = outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/sessions',
      payload: {},
    });
    outbox.claimNext(1);
    // Rig a future retry manually.
    const r = store.findById(row.id)!;
    store.update({ ...r, status: 'pending', nextRetryAt: 1_000_000 + 60_000 });
    // Before its retry time: not claimable.
    nowRef.value = 1_000_000 + 1_000;
    expect(outbox.claimNext(1).length).toBe(0);
    // After its retry time: claimable.
    nowRef.value = 1_000_000 + 60_000;
    expect(outbox.claimNext(1).length).toBe(1);
  });

  it('stats reports pending, inflight, dead-letter counts', () => {
    const a = outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/a',
      payload: {},
    });
    const b = outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/b',
      payload: {},
    });
    outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/c',
      payload: {},
    });
    outbox.claimNext(1); // marks the oldest (a) inflight
    outbox.markFailed(b.id, 'bad', { retryable: false });
    const s = outbox.stats();
    expect(s.pending + s.inflight + s.deadLetter).toBe(3);
    expect(s.deadLetter).toBe(1);
    // After claim a is inflight, b is dead, c is still pending.
    expect(s.inflight).toBe(1);
    expect(s.pending).toBe(1);
    // Prevent unused-var lint.
    expect(a.id).not.toBe(b.id);
  });

  it('purgeDone deletes completed rows older than cutoff', () => {
    const row = outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/sessions',
      payload: {},
    });
    outbox.claimNext(1);
    outbox.markDone(row.id);
    nowRef.value = 1_000_000 + 30 * 60_000; // 30 min later
    const n1 = outbox.purgeDone(60 * 60_000); // keep last hour
    expect(n1).toBe(0);
    nowRef.value = 1_000_000 + 2 * 60 * 60_000; // 2 hours later
    const n2 = outbox.purgeDone(60 * 60_000);
    expect(n2).toBe(1);
    expect(outbox.findById(row.id)).toBeNull();
  });

  it('requeueDeadLetter resets a dead-lettered row to pending', () => {
    const row = outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/sessions',
      payload: {},
    });
    outbox.claimNext(1);
    outbox.markFailed(row.id, 'HTTP 422', { retryable: false });
    expect(outbox.findById(row.id)!.status).toBe('dead_letter');
    const req = outbox.requeueDeadLetter(row.id);
    expect(req?.status).toBe('pending');
    expect(req?.attempts).toBe(0);
    expect(req?.lastError).toBeNull();
  });

  it('markDone is a no-op for unknown ids', () => {
    expect(() => outbox.markDone('req_does-not-exist')).not.toThrow();
  });

  it('claimable filter excludes completed and dead rows', () => {
    const ok = outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/a',
      payload: {},
    });
    const bad = outbox.enqueue({
      kind: 'session.start',
      method: 'POST',
      path: '/b',
      payload: {},
    });
    outbox.claimNext(2);
    outbox.markDone(ok.id);
    outbox.markFailed(bad.id, 'HTTP 422', { retryable: false });
    expect(outbox.claimNext(10).length).toBe(0);
    // Sanity: verify via raw store.
    const all = (store._all?.() ?? []) as OutboxRow[];
    expect(all.length).toBe(2);
  });
});

// src/main/services/sync/__tests__/sync-worker.test.ts
//
// Offline-first sync: work queued while the network is down must upload once
// it is back — never dropped. Uses the in-memory outbox and a fake network /
// api so no Electron, axios network or SQLite is involved.

import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { AxiosError } from 'axios';
import { createInMemoryOutboxStore, createOutbox, MAX_ATTEMPTS } from '../outbox';
import { createSyncWorker } from '../sync-worker';
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

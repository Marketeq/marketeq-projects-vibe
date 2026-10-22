// A keyed notification.send is delivered to each channel at most once, however it is retried.
//
// The idempotency row records which channels already went out (stored in-app row, realtime push,
// email) plus a lease. A retry (delay queue), a broker redelivery, a second worker or a restart
// resumes at the channel that did not finish. These tests drive the real NotificationService and
// NotificationDeliveryService over in-memory stores that enforce the same uniqueness and atomic
// updates the database does.
import { InternalServerErrorException } from '@nestjs/common';
import { CLAIM_LEASE_MS, NotificationInProgressException, NotificationService, notificationIdForKey } from '../services/notification.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationDeliveryMonitor } from './notification-delivery-monitor';
import { memoryIdempotencyRepo } from '../testing/in-memory-idempotency.repo';
import { ATTEMPT_HEADER, DEAD_LETTER_QUEUE, MAX_DELIVERY_ATTEMPTS, NOTIFICATION_QUEUE, RETRY_QUEUE_LONG, RETRY_QUEUE_SHORT } from './delivery.constants';

const payload = (over: any = {}) => ({
  recipientId: 'u1', category: 'payments', event: 'payout.schedule_paused', title: 'Scheduled payout paused', body: 'b',
  recipientEmail: 'u1@example.com', idempotencyKey: 'k1', ...over,
});

function rig() {
  const idempotencyRepo = memoryIdempotencyRepo();
  const stored = new Map<string, any>();
  const counts = { save: 0, ably: 0, badge: 0, email: 0 };
  const fail = { save: 0, ably: 0, email: 0, saveDelayed: false, ablyHangs: false };

  const notifRepo: any = {
    create: (v: any) => v,
    findOne: async ({ where }: any) => stored.get(where.id) ?? null,
    save: async (v: any) => {
      if (fail.save > 0) { fail.save--; throw new InternalServerErrorException('db down'); }
      if (fail.saveDelayed) await new Promise((r) => setImmediate(r));
      counts.save++;
      const row = { id: v.id ?? `n${stored.size + 1}`, ...v };
      stored.set(row.id, row); // a save with an existing id updates that row: one row per id
      return row;
    },
    count: async () => stored.size,
    createQueryBuilder: () => ({ where: () => ({ andWhere: () => ({ getCount: async () => stored.size }) }), getCount: async () => stored.size }),
  };
  const prefRepo: any = { findOne: async () => null };
  const ably: any = {
    isEnabled: () => true,
    sendInApp: jest.fn(async () => {
      if (fail.ablyHangs) return new Promise(() => undefined); // the worker dies here
      if (fail.ably > 0) { fail.ably--; throw new InternalServerErrorException('ably down'); }
      counts.ably++;
    }),
    updateBadgeCount: jest.fn(async () => { counts.badge++; }),
  };
  const brevo: any = {
    sendNotificationEmail: jest.fn(async () => {
      if (fail.email > 0) { fail.email--; throw new InternalServerErrorException('brevo rejected'); }
      counts.email++;
    }),
  };
  process.env.BREVO_API_KEY = 'test-key';
  const service = new NotificationService(notifRepo, prefRepo, idempotencyRepo, ably, brevo);
  jest.spyOn(service, 'getUnreadCount').mockResolvedValue(1);
  const monitor = new NotificationDeliveryMonitor();
  const delivery = new NotificationDeliveryService(service, monitor);

  // A minimal broker: queues, delayed retry queues and the acknowledgment calls.
  const queues = new Map<string, any[]>();
  const q = (name: string) => queues.get(name) ?? queues.set(name, []).get(name)!;
  const acks: any[] = [];
  const nacks: any[] = [];
  const chan: any = {
    ack: (m: any) => acks.push(m),
    nack: (m: any, _all: boolean, requeue: boolean) => { nacks.push(m); if (requeue) q(NOTIFICATION_QUEUE).unshift(m); },
    assertQueue: async () => undefined,
    publishFails: 0,
    sendToQueue: (queue: string, content: Buffer, options: any, cb: (e?: unknown) => void) => {
      if (chan.publishFails > 0) { chan.publishFails--; cb(new Error('broker refused')); return false; }
      q(queue).push({ content, properties: options });
      cb();
      return true;
    },
  };
  const message = (data: any, headers: any = {}) => ({ content: Buffer.from(JSON.stringify({ data })), properties: { headers } });
  const ctx = (m: any) => ({ getChannelRef: () => chan, getMessage: () => m }) as any;
  const publish = (data: any) => q(NOTIFICATION_QUEUE).push(message(data));
  /** Hand the next main-queue message to the handler, as the transport does. */
  const deliverNext = async () => {
    const m = q(NOTIFICATION_QUEUE).shift();
    if (!m) return false;
    await delivery.handle(JSON.parse(m.content.toString()).data, ctx(m));
    return true;
  };
  const drain = async () => { let g = 0; while (q(NOTIFICATION_QUEUE).length && g++ < 100) await deliverNext(); };
  /** The delay queues' TTL elapsed: their messages dead-letter back into the main queue. */
  const elapse = () => { for (const name of [RETRY_QUEUE_SHORT, RETRY_QUEUE_LONG]) q(NOTIFICATION_QUEUE).push(...q(name).splice(0)); };
  const row = (key = 'k1') => idempotencyRepo.rows.get(key);
  return { service, delivery, idempotencyRepo, stored, counts, fail, chan, q, acks, nacks, publish, deliverNext, drain, elapse, row, message, ctx, monitor, ably, brevo };
}

describe('notification.send channel idempotency', () => {
  it('delivers every channel once and records them on the key', async () => {
    const r = rig();
    r.publish(payload());
    await r.drain();
    expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 1 });
    expect(r.stored.size).toBe(1);
    expect([...r.stored.keys()][0]).toBe(notificationIdForKey('k1'));
    expect(r.row()).toMatchObject({ ablyDone: true, emailDone: true, notificationId: notificationIdForKey('k1') });
    expect(r.row()!.completedAt).toBeInstanceOf(Date);
    expect(r.acks).toHaveLength(1);
  });

  describe('partial failure: a completed channel is never repeated, a failed one is retried', () => {
    it('row stored, then Ably fails: the retry pushes Ably only; the row and the email are not repeated', async () => {
      const r = rig();
      r.fail.ably = 1;
      r.publish(payload());
      await r.drain();
      // pass 1: stored, Ably failed, email still went out (channels are independent); retry queued
      expect(r.counts).toMatchObject({ save: 1, ably: 0, email: 1 });
      expect(r.q(RETRY_QUEUE_SHORT)).toHaveLength(1);
      expect(r.row()).toMatchObject({ ablyDone: false, emailDone: true });
      expect(r.row()!.completedAt).toBeNull();
      expect(r.row()!.lockedUntil!.getTime()).toBeLessThanOrEqual(Date.now()); // handed back

      r.elapse();
      await r.drain();
      expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 1 });  // Ably now; nothing else repeated
      expect(r.stored.size).toBe(1);
      expect(r.row()!.completedAt).toBeInstanceOf(Date);
    });

    it('Ably succeeds, then the email fails: the retry sends the email only', async () => {
      const r = rig();
      r.fail.email = 1;
      r.publish(payload());
      await r.drain();
      expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 0 });
      expect(r.row()).toMatchObject({ ablyDone: true, emailDone: false });

      r.elapse();
      await r.drain();
      expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 1 });
      expect(r.stored.size).toBe(1);
      expect(r.row()!.completedAt).toBeInstanceOf(Date);
    });

    it('the in-app save itself fails: nothing else ran, and the retry delivers everything once', async () => {
      const r = rig();
      r.fail.save = 1;
      r.publish(payload());
      await r.drain();
      expect(r.counts).toMatchObject({ save: 0, ably: 0, email: 0 });
      expect(r.row()!.completedAt).toBeNull();
      r.elapse();
      await r.drain();
      expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 1 });
      expect(r.stored.size).toBe(1);
    });
  });

  describe('duplicates, redelivery and concurrency', () => {
    it('the broker redelivers a message that was fully delivered (crash before the ack): dropped, nothing repeated', async () => {
      const r = rig();
      const data = payload();
      const m = r.message(data);
      await r.delivery.handle(data, r.ctx(m));                 // delivered, acked
      await r.delivery.handle(data, r.ctx(m));                 // the broker never saw the ack
      expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 1 });
      expect(r.acks).toHaveLength(2);
      expect(r.q(DEAD_LETTER_QUEUE)).toHaveLength(0);
    });

    it('two copies processed at the same time: one delivers, the other waits and is then dropped as a duplicate', async () => {
      const r = rig();
      r.fail.saveDelayed = true;
      r.publish(payload());
      r.publish(payload());
      const first = r.deliverNext();
      const second = r.deliverNext();
      await Promise.all([first, second]);

      expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 1 });  // exactly one worker delivered
      expect(r.stored.size).toBe(1);
      // the loser was not lost and not dead-lettered: it is waiting in the retry queue
      expect(r.q(RETRY_QUEUE_SHORT)).toHaveLength(1);
      expect(r.q(DEAD_LETTER_QUEUE)).toHaveLength(0);
      r.elapse();
      await r.drain();
      expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 1 });  // and the retry is a recognised duplicate
      expect(r.acks).toHaveLength(3);  // winner, the loser's original (after its retry was stored), the retry
    });

    it('the in-progress signal is retriable, not a failure of the notification', async () => {
      const r = rig();
      r.fail.saveDelayed = true;
      const a = r.service.dispatch(payload() as any);
      await expect(r.service.dispatch(payload() as any)).rejects.toBeInstanceOf(NotificationInProgressException);
      await a;
      expect(r.stored.size).toBe(1);
    });
  });

  describe('a worker that dies mid-delivery', () => {
    it('lease live: the redelivery waits; lease expired: it takes over, stores no second row and finishes the rest once', async () => {
      const r = rig();
      // Worker A stores the row, then dies inside the realtime push (never returns, never releases).
      r.fail.ablyHangs = true;
      void r.service.dispatch(payload() as any);
      await new Promise((res) => setImmediate(res));
      await new Promise((res) => setImmediate(res));
      expect(r.stored.size).toBe(1);
      expect(r.row()).toMatchObject({ notificationId: notificationIdForKey('k1'), ablyDone: false, emailDone: false });
      expect(r.row()!.completedAt).toBeNull();

      // The broker redelivers A's unacknowledged message to worker B while A's lease is live.
      r.fail.ablyHangs = false;
      r.publish(payload());
      await r.drain();
      expect(r.counts.email).toBe(0);                                  // B did not run alongside A
      expect(r.q(RETRY_QUEUE_SHORT)).toHaveLength(1);

      // A's lease runs out (it is dead). The retry takes over.
      r.row()!.lockedUntil = new Date(Date.now() - 1);
      r.elapse();
      await r.drain();
      expect(r.stored.size).toBe(1);                                   // still exactly one stored notification
      expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 1 });
      expect(r.row()!.completedAt).toBeInstanceOf(Date);
    });

    it('a restart after the key completed but before the ack: the redelivery is a duplicate', async () => {
      const r = rig();
      await r.service.dispatch(payload() as any);                      // completed; the process dies before acking
      const again = r.message(payload());
      await r.delivery.handle(payload(), r.ctx(again));
      expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 1 });
      expect(r.acks).toContain(again);
    });

    it('the lease is long enough to cover a normal delivery and short enough to recover from a crash', () => {
      expect(CLAIM_LEASE_MS).toBeGreaterThanOrEqual(30_000);
      expect(CLAIM_LEASE_MS).toBeLessThanOrEqual(5 * 60_000);
    });
  });

  describe('retry queue and dead-letter queue', () => {
    it('the retry cannot be published: the original is requeued, and its redelivery resumes without repeating anything', async () => {
      const r = rig();
      r.fail.email = 1;
      r.chan.publishFails = 1;
      r.publish(payload());
      await r.deliverNext();
      expect(r.nacks).toHaveLength(1);                                 // not acked: kept
      expect(r.acks).toHaveLength(0);
      expect(r.q(RETRY_QUEUE_SHORT)).toHaveLength(0);
      expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 0 });

      await r.drain();                                                 // the requeued original comes back
      expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 1 });
      expect(r.row()!.completedAt).toBeInstanceOf(Date);
    });

    it('a channel that never recovers is dead-lettered after the maximum attempts, with the channels that did go out kept', async () => {
      const r = rig();
      r.fail.email = 99;
      r.publish(payload());
      for (let i = 0; i < MAX_DELIVERY_ATTEMPTS + 2; i++) { r.elapse(); await r.drain(); }
      expect(r.q(DEAD_LETTER_QUEUE)).toHaveLength(1);
      expect(r.q(RETRY_QUEUE_SHORT).length + r.q(RETRY_QUEUE_LONG).length).toBe(0);
      expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 0 });  // stored and pushed once, never again
      expect(r.brevo.sendNotificationEmail).toHaveBeenCalledTimes(MAX_DELIVERY_ATTEMPTS);
      expect(r.row()).toMatchObject({ ablyDone: true, emailDone: false });
      expect(r.monitor['deadLettered']).toBe(1);

      // Later the email provider recovers and the dead-lettered message is replayed: only the email goes.
      r.fail.email = 0;
      const dead = r.q(DEAD_LETTER_QUEUE).shift();
      r.q(NOTIFICATION_QUEUE).push({ content: dead.content, properties: { headers: {} } });
      await r.drain();
      expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 1 });
      expect(r.stored.size).toBe(1);
      expect(r.row()!.completedAt).toBeInstanceOf(Date);
    });

    it('a malformed message is dead-lettered without claiming a key', async () => {
      const r = rig();
      r.publish({ idempotencyKey: 'bad', recipientId: 'u1' });
      await r.drain();
      expect(r.q(DEAD_LETTER_QUEUE)).toHaveLength(1);
      expect(r.row('bad')).toBeUndefined();
    });
  });

  describe('notifications without a key keep their original behaviour', () => {
    it('one attempt: no claim row, no retry, no dead letter, and a failed email is logged and acknowledged', async () => {
      const r = rig();
      r.fail.email = 1;
      r.publish(payload({ idempotencyKey: undefined }));
      await r.drain();
      expect(r.idempotencyRepo.rows.size).toBe(0);
      expect(r.counts).toMatchObject({ save: 1, ably: 1, email: 0 });
      expect(r.q(RETRY_QUEUE_SHORT)).toHaveLength(0);
      expect(r.q(DEAD_LETTER_QUEUE)).toHaveLength(0);
      expect(r.acks).toHaveLength(1);
      expect(r.nacks).toHaveLength(0);
    });

    it('a failed Ably push stays best-effort (the row is stored, nothing is retried or thrown)', async () => {
      const r = rig();
      r.fail.ably = 1;
      await expect(r.service.dispatch(payload({ idempotencyKey: undefined }) as any)).resolves.toBeTruthy();
      expect(r.counts).toMatchObject({ save: 1, email: 1 });
    });

    it('two identical unkeyed messages are two notifications, as before', async () => {
      const r = rig();
      r.publish(payload({ idempotencyKey: undefined }));
      r.publish(payload({ idempotencyKey: undefined }));
      await r.drain();
      expect(r.counts.save).toBe(2);
      expect(r.stored.size).toBe(2);
    });

    it('a blank key is treated as no key', async () => {
      const r = rig();
      await r.service.dispatch(payload({ idempotencyKey: '   ' }) as any);
      expect(r.idempotencyRepo.rows.size).toBe(0);
    });
  });

  describe('state recorded for the key', () => {
    it('a database failure while recording a finished channel is surfaced, so the retry covers it', async () => {
      const r = rig();
      r.idempotencyRepo.failNextUpdate((patch: any) => 'emailDone' in patch);
      r.publish(payload());
      await r.drain();
      expect(r.counts.email).toBe(1);
      expect(r.q(RETRY_QUEUE_SHORT)).toHaveLength(1);   // not silently lost
      expect(r.row()!.completedAt).toBeNull();
    });
  });
});

describe('notificationIdForKey', () => {
  it('is deterministic and UUID-shaped, and differs per key', () => {
    expect(notificationIdForKey('a')).toBe(notificationIdForKey('a'));
    expect(notificationIdForKey('a')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(notificationIdForKey('a')).not.toBe(notificationIdForKey('b'));
  });
});

// Keep the unused import honest: ATTEMPT_HEADER documents that attempts travel on the retry message.
void ATTEMPT_HEADER;

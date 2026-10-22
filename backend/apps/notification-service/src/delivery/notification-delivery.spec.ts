import { InternalServerErrorException } from '@nestjs/common'
import { NotificationController } from '../controllers/notification.controller';
import { NotificationService, notificationIdForKey } from '../services/notification.service';
import { memoryIdempotencyRepo } from '../testing/in-memory-idempotency.repo';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationDeliveryMonitor } from './notification-delivery-monitor';
import { AckingServerRMQ } from './acking-server-rmq';
import {
  ATTEMPT_HEADER,
  DEAD_LETTER_QUEUE,
  MAX_DELIVERY_ATTEMPTS,
  NOTIFICATION_QUEUE,
  RETRY_QUEUE_LONG,
  RETRY_QUEUE_SHORT,
} from './delivery.constants';

const payload = (over: any = {}) => ({
  recipientId: 'acct-1', category: 'account', event: 'payout.schedule_paused_verification',
  title: 'Scheduled payout paused', body: 'b', idempotencyKey: 'k1', ...over,
});

// A tiny broker: named queues, an ack/nack ledger, and the delay queues' TTL dead-lettering.
function broker() {
  const queues = new Map<string, any[]>();
  const q = (n: string) => queues.get(n) ?? (queues.set(n, []), queues.get(n)!);
  const acked: any[] = [];
  const nacked: Array<{ msg: any; requeue: boolean }> = [];
  const asserted: Array<{ name: string; options: any }> = [];
  const failPublishTo = new Set<string>();
  const channel: any = {
    assertQueue: jest.fn(async (name: string, options: any) => { asserted.push({ name, options }); }),
    sendToQueue: jest.fn((name: string, content: Buffer, options: any, cb?: (e?: any) => void) => {
      if (failPublishTo.has(name)) { cb?.(new Error('nack from broker')); return false; }
      q(name).push({ content, properties: { headers: options.headers, contentType: options.contentType } });
      cb?.(null);
      return true;
    }),
    waitForConfirms: () => Promise.resolve(),
    ack: jest.fn((m: any) => { acked.push(m); }),
    nack: jest.fn((m: any, _all: boolean, requeue: boolean) => { nacked.push({ msg: m, requeue }); if (requeue) q(NOTIFICATION_QUEUE).unshift(m); }),
    checkQueue: jest.fn(async (name: string) => ({ messageCount: q(name).length })),
  };
  const publishToMain = (data: any, headers: any = {}) => {
    const content = Buffer.from(JSON.stringify({ pattern: 'notification.send', data }));
    q(NOTIFICATION_QUEUE).push({ content, properties: { headers } });
  };
  // Hand every waiting retry message back to the main queue (its TTL elapsed).
  const elapseDelays = () => { for (const n of [RETRY_QUEUE_SHORT, RETRY_QUEUE_LONG]) q(n).splice(0).forEach((m) => q(NOTIFICATION_QUEUE).push(m)); };
  return { q, channel, acked, nacked, asserted, failPublishTo, publishToMain, elapseDelays };
}

function rig(opts: { save?: jest.Mock } = {}) {
  const b = broker();
  const stored: any[] = [];
  const idempotencyRepo: any = memoryIdempotencyRepo();
  // "Claimed" here means the key is completed: a repeat of it is a duplicate.
  const claimed = {
    get size() { return [...idempotencyRepo.rows.values()].filter((r: any) => r.completedAt).length; },
    has: (k: string) => !!idempotencyRepo.rows.get(k)?.completedAt,
  };
  const save = opts.save ?? jest.fn(async (v: any) => { const r = { id: `n${stored.length + 1}`, ...v }; const at = stored.findIndex((x) => x.id === r.id); if (at >= 0) stored[at] = r; else stored.push(r); return r; });
  const notifRepo: any = { create: (v: any) => v, save, findOne: async ({ where }: any) => stored.find((r) => r.id === where.id) ?? null };
  const prefRepo: any = { findOne: async () => null };
  const service = new NotificationService(notifRepo, prefRepo, idempotencyRepo, { isEnabled: () => false } as any, {} as any);
  const monitor = new NotificationDeliveryMonitor();
  const delivery = new NotificationDeliveryService(service, monitor);
  const controller = new NotificationController(service, {} as any, delivery, monitor, {} as any);
  // Consume the main queue like the transport does: parse, hand to the controller with a context.
  const drain = async () => {
    let guard = 0;
    while (b.q(NOTIFICATION_QUEUE).length && guard++ < 200) {
      const msg = b.q(NOTIFICATION_QUEUE).shift();
      const data = JSON.parse(msg.content.toString()).data;
      await controller.handleSend(data, { getChannelRef: () => b.channel, getMessage: () => msg } as any);
    }
  };
  return { b, claimed, stored, service, monitor, delivery, controller, drain, save, idempotencyRepo };
}

describe('notification.send: reliable processing with manual acknowledgment', () => {
  it('successful dispatch -> stored once and acknowledged once', async () => {
    const r = rig();
    r.b.publishToMain(payload());
    await r.drain();
    expect(r.stored).toHaveLength(1);
    expect(r.b.channel.ack).toHaveBeenCalledTimes(1);
    expect(r.b.nacked).toHaveLength(0);
    expect(r.b.q(RETRY_QUEUE_SHORT)).toHaveLength(0);
  });

  it('duplicate delivery -> acknowledged without a second notification', async () => {
    const r = rig();
    r.b.publishToMain(payload());
    r.b.publishToMain(payload());
    await r.drain();
    expect(r.stored).toHaveLength(1);
    expect(r.b.channel.ack).toHaveBeenCalledTimes(2);
    expect(r.b.q(DEAD_LETTER_QUEUE)).toHaveLength(0);
  });

  it('temporary failure -> claim released, retried through the delay queue with the SAME key, then delivered', async () => {
    const stored: any[] = [];
    let calls = 0;
    const save = jest.fn(async (v: any) => { if (++calls <= 2) throw new InternalServerErrorException('db down'); const r = { id: 'n1', ...v }; stored.push(r); return r; });
    const r = rig({ save });
    r.b.publishToMain(payload());
    await r.drain();
    // first failure: original acked only after the retry was stored; claim released
    expect(r.b.q(RETRY_QUEUE_SHORT)).toHaveLength(1);
    expect(r.claimed.size).toBe(0);
    expect(r.idempotencyRepo.rows.get('k1')!.completedAt).toBeNull();      // not mistaken for a delivered key
    expect(r.idempotencyRepo.rows.get('k1')!.lockedUntil!.getTime()).toBeLessThanOrEqual(Date.now()); // handed back for the retry
    const retried = r.b.q(RETRY_QUEUE_SHORT)[0];
    expect(retried.properties.headers[ATTEMPT_HEADER]).toBe(1);
    expect(JSON.parse(retried.content.toString()).data.idempotencyKey).toBe('k1');
    r.b.elapseDelays(); await r.drain();   // attempt 2 fails again
    r.b.elapseDelays(); await r.drain();   // attempt 3 succeeds
    expect(stored).toHaveLength(1);
    expect(r.claimed.has('k1')).toBe(true);
    expect(r.b.q(DEAD_LETTER_QUEUE)).toHaveLength(0);
    expect(r.monitor['deadLettered']).toBe(0);
    expect(r.b.nacked).toHaveLength(0);
  });

  it('permanent failure -> bounded retries, then dead-lettered with the original body; signalled on health', async () => {
    const save = jest.fn(async () => { throw new InternalServerErrorException('boom'); });
    const r = rig({ save });
    r.b.publishToMain(payload());
    for (let i = 0; i < MAX_DELIVERY_ATTEMPTS + 3; i++) { await r.drain(); r.b.elapseDelays(); }
    expect(save).toHaveBeenCalledTimes(MAX_DELIVERY_ATTEMPTS); // bounded
    expect(r.b.q(DEAD_LETTER_QUEUE)).toHaveLength(1);
    const dead = r.b.q(DEAD_LETTER_QUEUE)[0];
    expect(JSON.parse(dead.content.toString()).data.idempotencyKey).toBe('k1');
    expect(dead.properties.headers['x-notification-failure']).toContain('boom');
    expect(r.claimed.size).toBe(0);
    expect(r.b.q(NOTIFICATION_QUEUE)).toHaveLength(0);
    const snap = await r.monitor.snapshot();
    expect(snap).toMatchObject({ healthy: false, deadLetteredSinceBoot: 1, deadLetterQueueDepth: 1, lastDeadLetter: expect.objectContaining({ idempotencyKey: 'k1', attempts: MAX_DELIVERY_ATTEMPTS }) });
    expect((await r.controller.health()).notificationDelivery.healthy).toBe(false);
  });

  it('later retries wait in the longer delay queue', async () => {
    const r = rig({ save: jest.fn(async () => { throw new InternalServerErrorException('boom'); }) });
    r.b.publishToMain(payload());
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      await r.drain();
      for (const n of [RETRY_QUEUE_SHORT, RETRY_QUEUE_LONG]) if (r.b.q(n).length) seen.push(n);
      r.b.elapseDelays();
    }
    expect(seen).toEqual([RETRY_QUEUE_SHORT, RETRY_QUEUE_SHORT, RETRY_QUEUE_LONG, RETRY_QUEUE_LONG]);
  });

  it('failure while publishing the retry -> the original is not acknowledged, it is requeued', async () => {
    const r = rig({ save: jest.fn(async () => { throw new InternalServerErrorException('db down'); }) });
    r.b.failPublishTo.add(RETRY_QUEUE_SHORT);
    r.b.publishToMain(payload());
    const msg = r.b.q(NOTIFICATION_QUEUE)[0];
    const data = JSON.parse(msg.content.toString()).data;
    r.b.q(NOTIFICATION_QUEUE).shift();
    await r.controller.handleSend(data, { getChannelRef: () => r.b.channel, getMessage: () => msg } as any);
    expect(r.b.channel.ack).not.toHaveBeenCalled();
    expect(r.b.nacked).toEqual([{ msg, requeue: true }]);
    expect(r.b.q(NOTIFICATION_QUEUE)).toEqual([msg]);
    expect(r.claimed.size).toBe(0);
  });

  it('failure while dead-lettering -> the original stays unacknowledged (requeued)', async () => {
    const r = rig({ save: jest.fn(async () => { throw new InternalServerErrorException('boom'); }) });
    r.b.failPublishTo.add(DEAD_LETTER_QUEUE);
    r.b.publishToMain(payload(), { [ATTEMPT_HEADER]: MAX_DELIVERY_ATTEMPTS - 1 });
    const msg = r.b.q(NOTIFICATION_QUEUE).shift();
    await r.controller.handleSend(JSON.parse(msg.content.toString()).data, { getChannelRef: () => r.b.channel, getMessage: () => msg } as any);
    expect(r.b.channel.ack).not.toHaveBeenCalled();
    expect(r.b.nacked[0]).toEqual({ msg, requeue: true });
    expect(r.monitor['deadLettered']).toBe(0);
  });

  it('a malformed message can never succeed: dead-lettered at once, not retried', async () => {
    const r = rig();
    r.b.publishToMain({ recipientId: 'x' });
    await r.drain();
    expect(r.b.q(DEAD_LETTER_QUEUE)).toHaveLength(1);
    expect(r.b.q(RETRY_QUEUE_SHORT)).toHaveLength(0);
    expect(r.b.channel.ack).toHaveBeenCalledTimes(1);
  });

  it('idempotency claims are released after a failed delivery, so a retry is not dropped as a duplicate', async () => {
    let fail = true;
    const r = rig({ save: jest.fn(async (v: any) => { if (fail) throw new InternalServerErrorException('x'); return { id: 'n', ...v }; }) });
    await expect(r.service.dispatch(payload() as any)).rejects.toThrow('x');
    expect(r.claimed.size).toBe(0);
    fail = false;
    await expect(r.service.dispatch(payload() as any)).resolves.toMatchObject({ id: notificationIdForKey('k1') });
  });

  it('an email failure after the in-app row was stored does not re-store it on retry', async () => {
    const r = rig();
    (r.service as any).prefRepo = { findOne: async () => ({ userId: 'acct-1', channels: { inApp: { enabled: true, bell: true, popup: true, browser: false }, email: { enabled: true, address: 'a@b.c' }, sms: { enabled: false, phone: null } }, categories: {}, notifications: {} }) };
    (r.service as any).sendEmailViaBrevo = jest.fn(async () => { throw new InternalServerErrorException('brevo down'); });
    r.b.publishToMain(payload({ delivery: { inApp: true, email: true } }));
    await r.drain();
    expect(r.stored).toHaveLength(1);
    expect(r.b.q(RETRY_QUEUE_SHORT)).toHaveLength(0);
    expect(r.b.channel.ack).toHaveBeenCalledTimes(1);
  });

  it('declares only NEW queues; the main queue is never re-declared', async () => {
    const r = rig({ save: jest.fn(async () => { throw new InternalServerErrorException('x'); }) });
    r.b.publishToMain(payload());
    await r.drain();
    const names = r.b.asserted.map((a) => a.name);
    expect(names).toEqual(expect.arrayContaining([RETRY_QUEUE_SHORT, RETRY_QUEUE_LONG, DEAD_LETTER_QUEUE]));
    expect(names).not.toContain(NOTIFICATION_QUEUE);
    const short = r.b.asserted.find((a) => a.name === RETRY_QUEUE_SHORT)!;
    expect(short.options.arguments).toMatchObject({ 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': NOTIFICATION_QUEUE, 'x-message-ttl': 30000 });
  });
});

describe('AckingServerRMQ: other producers keep working under manual acknowledgment', () => {
  const server = () => new AckingServerRMQ({ urls: ['amqp://x'], queue: NOTIFICATION_QUEUE, queueOptions: { durable: true }, noAck: false });
  const msg = (pattern: string, data: any = {}) => ({ content: Buffer.from(JSON.stringify({ pattern, data })), properties: {} });
  const chan = () => ({ ack: jest.fn(), nack: jest.fn() });

  it('acks a handled legacy event after its handler ran', async () => {
    const s = server(); const c = chan(); const h = jest.fn(async () => undefined);
    s.addHandler('invitation.created', h as any, true);
    const m = msg('invitation.created');
    await s.handleMessage(m as any, c as any);
    expect(h).toHaveBeenCalledTimes(1);
    expect(c.ack).toHaveBeenCalledWith(m);
  });

  it('acks a legacy event whose handler throws (previous at-most-once behaviour)', async () => {
    const s = server(); const c = chan();
    s.addHandler('notification.email.team_invitation', (async () => { throw new InternalServerErrorException('smtp'); }) as any, true);
    const m = msg('notification.email.team_invitation');
    await s.handleMessage(m as any, c as any);
    expect(c.ack).toHaveBeenCalledWith(m);
  });

  it('acks an event nobody handles (e.g. invitation.accepted) instead of stalling the queue', async () => {
    const s = server(); const c = chan();
    const m = msg('invitation.accepted');
    await s.handleMessage(m as any, c as any);
    expect(c.ack).toHaveBeenCalledWith(m);
  });

  it('leaves notification.send acknowledgment to its own handler', async () => {
    const s = server(); const c = chan();
    s.addHandler('notification.send', (async () => undefined) as any, true);
    await s.handleMessage(msg('notification.send') as any, c as any);
    expect(c.ack).not.toHaveBeenCalled();
  });

  it('a notification.send handler that throws is left unacknowledged for redelivery', async () => {
    const s = server(); const c = chan();
    s.addHandler('notification.send', (async () => { throw new InternalServerErrorException('x'); }) as any, true);
    await s.handleMessage(msg('notification.send') as any, c as any);
    expect(c.ack).not.toHaveBeenCalled();
    expect(c.nack).not.toHaveBeenCalled();
  });
});

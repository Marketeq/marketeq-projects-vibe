// G9: the scheduled-payout-paused notification travels payout-service ->
// `notification.send` on notification-service's queue -> NotificationController ->
// NotificationService.dispatch. The publisher below is payout-service's real one; the
// controller and service are notification-service's real ones (repositories faked).
import { of, throwError } from 'rxjs';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationService } from './notification.service';
import { memoryIdempotencyRepo } from '../testing/in-memory-idempotency.repo';
import { NotificationDeliveryService } from '../delivery/notification-delivery.service';
import { NotificationDeliveryMonitor } from '../delivery/notification-delivery-monitor';
import {
  NOTIFICATION_SEND_PATTERN,
  NOTIFICATION_SERVICE_QUEUE,
  PayoutNotificationPublisher,
  SCHEDULE_PAUSED_BODY,
  SCHEDULE_PAUSED_EVENT,
  SCHEDULE_PAUSED_TITLE,
  schedulePausedIdempotencyKey,
} from '../../../payout-service/src/publishers/payout-notification.publisher';

function world() {
  const stored: any[] = [];
  const idempotencyRepo = memoryIdempotencyRepo();
  const claimed = {
    get size() { return [...idempotencyRepo.rows.values()].filter((r: any) => r.completedAt).length; },
    has: (k: string) => !!idempotencyRepo.rows.get(k)?.completedAt,
  };
  const notifRepo = {
    create: (v: any) => v,
    findOne: jest.fn(async ({ where }: any) => stored.find((r) => r.id === where.id) ?? null),
    save: jest.fn(async (v: any) => { const row = { id: `n${stored.length + 1}`, ...v }; const at = stored.findIndex((x) => x.id === row.id); if (at >= 0) stored[at] = row; else stored.push(row); return row; }),
  };
  const prefRepo = { findOne: jest.fn(async () => null) };
  const ably = { isEnabled: () => false };
  const brevo = {};
  const service = new NotificationService(notifRepo as any, prefRepo as any, idempotencyRepo as any, ably as any, brevo as any);
  const monitor = new NotificationDeliveryMonitor();
  const controller0 = new NotificationController(service, brevo as any, new NotificationDeliveryService(service, monitor, {} as any), monitor, {} as any);
  const channel = { ack: jest.fn(), nack: jest.fn(), assertQueue: jest.fn(), sendToQueue: jest.fn() };
  // Same handler the broker calls, with the acknowledgment context the transport supplies.
  const controller = {
    handleSend: (data: any) => controller0.handleSend(data, { getChannelRef: () => channel, getMessage: () => ({ content: Buffer.from('{}'), properties: {} }) } as any),
  };

  // The broker: whatever payout-service emits is what the controller handler receives.
  const delivered: Array<{ pattern: string; data: any }> = [];
  const client = {
    emit: jest.fn((pattern: string, data: any) => { delivered.push({ pattern, data }); return of(undefined); }),
  };
  const publisher = new PayoutNotificationPublisher(client as any);
  const deliverAll = async () => { for (const d of delivered.splice(0)) await controller.handleSend(d.data); };
  return { stored, publisher, client, delivered, deliverAll, notifRepo, idempotencyRepo, claimed, controller, channel };
}

const schedule = { id: 's1', contractorId: 'acct-1' };
const at = new Date('2026-10-14T12:00:00.000Z');

describe('G9 schedule-paused notification: payout-service -> notification-service', () => {
  it('reaches the real notification handler and stores the neutral notification for the schedule owner', async () => {
    const w = world();
    expect(await w.publisher.schedulePausedForVerification(schedule, at)).toBe(true);
    expect(w.client.emit).toHaveBeenCalledWith(NOTIFICATION_SEND_PATTERN, expect.anything());
    expect(NOTIFICATION_SEND_PATTERN).toBe('notification.send');
    expect(NOTIFICATION_SERVICE_QUEUE).toBe('notification_service_queue');
    await w.deliverAll();
    expect(w.stored).toHaveLength(1);
    expect(w.stored[0]).toMatchObject({
      userId: 'acct-1',
      title: 'Scheduled payout paused',
      body: "Your scheduled payout didn't run because account verification is required. Your balance and payout schedule are unchanged.",
      link: '/talent-dashboard',
      event: SCHEDULE_PAUSED_EVENT,
      category: 'account',
      origin: 'payout-service',
    });
    expect(SCHEDULE_PAUSED_TITLE).toBe(w.stored[0].title);
    expect(SCHEDULE_PAUSED_BODY).toBe(w.stored[0].body);
  });

  it('exposes no gate decision or missingRequirements', async () => {
    const w = world();
    await w.publisher.schedulePausedForVerification(schedule, at);
    const text = JSON.stringify(w.delivered[0].data);
    for (const leak of ['missingRequirements', 'gateOpen', 'gate_open', 'identity', 'location']) {
      expect(text.toLowerCase()).not.toContain(leak.toLowerCase());
    }
    expect(w.delivered[0].data.metadata).toEqual({ scheduleId: 's1' });
  });

  it('carries an idempotency key that is stable for one pause and different for the next', async () => {
    const w = world();
    await w.publisher.schedulePausedForVerification(schedule, at);
    expect(w.delivered[0].data.idempotencyKey).toBe(schedulePausedIdempotencyKey('s1', at));
    expect(schedulePausedIdempotencyKey('s1', at)).not.toBe(schedulePausedIdempotencyKey('s1', new Date(at.getTime() + 1000)));
    expect(schedulePausedIdempotencyKey('s1', at)).not.toBe(schedulePausedIdempotencyKey('s2', at));
  });

  it('queue redelivery, republish and duplicate events produce exactly one notification', async () => {
    const w = world();
    await w.publisher.schedulePausedForVerification(schedule, at);
    const msg = w.delivered[0].data;
    for (let i = 0; i < 3; i++) await w.controller.handleSend(msg); // broker redelivery
    await w.publisher.schedulePausedForVerification(schedule, at); // sweep / retry republish
    await w.deliverAll();
    expect(w.stored).toHaveLength(1);
  });

  it('concurrent workers processing the same event deliver once', async () => {
    const w = world();
    await w.publisher.schedulePausedForVerification(schedule, at);
    const msg = w.delivered[0].data;
    await Promise.all([1, 2, 3, 4].map(() => w.controller.handleSend(msg)));
    expect(w.stored).toHaveLength(1);
  });

  it('a later, separate pause of the same schedule is a new notification', async () => {
    const w = world();
    await w.publisher.schedulePausedForVerification(schedule, at);
    await w.publisher.schedulePausedForVerification(schedule, new Date(at.getTime() + 86400_000));
    await w.deliverAll();
    expect(w.stored).toHaveLength(2);
  });

  it('a delivery that fails releases the key so the retry is delivered, not dropped', async () => {
    const w = world();
    await w.publisher.schedulePausedForVerification(schedule, at);
    const msg = w.delivered[0].data;
    w.notifRepo.save.mockRejectedValueOnce(new Error('db down'));
    await w.controller.handleSend(msg); // fails -> claim released, retry scheduled, original acked
    expect(w.claimed.size).toBe(0);
    expect(w.channel.sendToQueue).toHaveBeenCalledTimes(1);
    await w.controller.handleSend(msg);
    expect(w.stored).toHaveLength(1);
  });

  it('a broker failure is reported (false) and never throws into the payout/schedule code', async () => {
    const w = world();
    w.client.emit.mockReturnValueOnce(throwError(() => new Error('connection closed')));
    await expect(w.publisher.schedulePausedForVerification(schedule, at)).resolves.toBe(false);
  });

  it('notifications without a key are unchanged (no claim)', async () => {
    const w = world();
    await w.controller.handleSend({ recipientId: 'a', category: 'teams', event: 'e', title: 't', body: 'b' } as any);
    await w.controller.handleSend({ recipientId: 'a', category: 'teams', event: 'e', title: 't', body: 'b' } as any);
    expect(w.stored).toHaveLength(2);
    expect(w.claimed.size).toBe(0);
  });
});

import { InternalServerErrorException } from '@nestjs/common';
import { AckingServerRMQ } from './acking-server-rmq';
import {
  ATTEMPT_HEADER,
  DEAD_LETTER_QUEUE,
  NOTIFICATION_QUEUE,
  RETRY_QUEUE_SHORT,
  STATUS_ALERT_PATTERN,
} from './delivery.constants';
import { NotificationDeliveryMonitor } from './notification-delivery-monitor';
import { NotificationDeliveryService } from './notification-delivery.service';

const payload = {
  recipientId: 'account-1',
  type: 'travel_mode' as const,
  occurrenceKey: 'travel-mode:2026-10-22T12:00:00.000Z',
  title: 'Travel Mode is active',
  body: 'Your account is currently in Travel Mode.',
};

function rig(upsert = jest.fn().mockResolvedValue({ id: 'alert-1' })) {
  const queues = new Map<string, any[]>();
  const queue = (name: string) =>
    queues.get(name) ?? (queues.set(name, []), queues.get(name)!);
  const channel = {
    assertQueue: jest.fn().mockResolvedValue(undefined),
    checkQueue: jest.fn(async (name: string) => ({
      messageCount: queue(name).length,
    })),
    sendToQueue: jest.fn(
      (
        name: string,
        content: Buffer,
        options: any,
        callback: (error?: Error) => void,
      ) => {
        queue(name).push({ content, properties: { headers: options.headers } });
        callback?.();
        return true;
      },
    ),
    waitForConfirms: jest.fn().mockResolvedValue(undefined),
    ack: jest.fn(),
    nack: jest.fn(),
  };
  const message = {
    content: Buffer.from(
      JSON.stringify({ pattern: STATUS_ALERT_PATTERN, data: payload }),
    ),
    properties: { headers: {} },
  };
  const context = {
    getChannelRef: () => channel,
    getMessage: () => message,
  } as any;
  const monitor = new NotificationDeliveryMonitor();
  const delivery = new NotificationDeliveryService({} as any, monitor, {
    upsert,
  } as any);
  return { channel, context, delivery, message, monitor, queue, upsert };
}

describe('persistent status alert delivery', () => {
  it('acknowledges only after the alert is stored', async () => {
    const r = rig();

    await r.delivery.handleStatusAlert(payload, r.context);

    expect(r.upsert).toHaveBeenCalledWith(payload);
    expect(r.channel.ack).toHaveBeenCalledWith(r.message);
    expect(r.channel.nack).not.toHaveBeenCalled();
  });

  it('queues a database failure for retry before acknowledging the original', async () => {
    const r = rig(
      jest.fn().mockRejectedValue(new InternalServerErrorException('db down')),
    );

    await r.delivery.handleStatusAlert(payload, r.context);

    expect(r.queue(RETRY_QUEUE_SHORT)).toHaveLength(1);
    expect(
      r.queue(RETRY_QUEUE_SHORT)[0].properties.headers[ATTEMPT_HEADER],
    ).toBe(1);
    expect(r.channel.ack).toHaveBeenCalledWith(r.message);
  });

  it('dead-letters malformed status-alert events without calling storage', async () => {
    const r = rig();

    await r.delivery.handleStatusAlert(
      { ...payload, occurrenceKey: '' },
      r.context,
    );

    expect(r.upsert).not.toHaveBeenCalled();
    expect(r.queue(DEAD_LETTER_QUEUE)).toHaveLength(1);
    expect(r.channel.ack).toHaveBeenCalledWith(r.message);
  });

  it('leaves acknowledgment for this pattern to its reliable handler', async () => {
    const server = new AckingServerRMQ({
      urls: ['amqp://example'],
      queue: NOTIFICATION_QUEUE,
      queueOptions: { durable: true },
      noAck: false,
    });
    const channel = { ack: jest.fn(), nack: jest.fn() };
    server.addHandler(
      STATUS_ALERT_PATTERN,
      (async () => undefined) as any,
      true,
    );

    await server.handleMessage(rig().message as any, channel as any);

    expect(channel.ack).not.toHaveBeenCalled();
  });
});

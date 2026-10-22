// Reliable processing of `notification.send` (manual acknowledgment).
//
//   no idempotency key -> one attempt, then ack (a failure is logged, never retried: unchanged)
//   dispatch succeeds (or the idempotency key shows it was already delivered)  -> ack
//   dispatch throws   (NotificationService keeps the channels already delivered and frees the key)
//        -> republish the UNCHANGED message (same body, so the same idempotency key) to a delay
//        queue, then ack the original; the delay queue dead-letters it back into the main queue
//        after its TTL, and the retry resumes at the channel that did not finish
//   still failing after MAX_DELIVERY_ATTEMPTS, or malformed (can never succeed) -> dead-letter
//        queue, error log, monitor counter, health signal, then ack the original
//   the retry / dead-letter publish itself fails -> the original is NOT acked: nack with requeue
import { Injectable, Logger } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';
import { NotificationPayload, NotificationService } from '../services/notification.service';
import { NotificationDeliveryMonitor } from './notification-delivery-monitor';
import {
  PersistentStatusAlertPayload,
  PersistentStatusAlertService,
  persistentStatusAlertPayloadProblem,
} from '../services/persistent-status-alert.service';
import {
  ATTEMPT_HEADER,
  DEAD_LETTER_QUEUE,
  FAILED_AT_HEADER,
  FAILURE_HEADER,
  MAX_DELIVERY_ATTEMPTS,
  NOTIFICATION_QUEUE,
  RETRY_DELAY_LONG_MS,
  RETRY_DELAY_SHORT_MS,
  RETRY_QUEUE_LONG,
  RETRY_QUEUE_SHORT,
} from './delivery.constants';

const str = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

function describe(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).slice(0, 300);
}

/** Why a payload can never be delivered, or null if it is well-formed. */
export function payloadProblem(p: Partial<NotificationPayload> | null | undefined): string | null {
  if (!p || typeof p !== 'object') return 'payload is not an object';
  for (const k of ['recipientId', 'category', 'event', 'title', 'body'] as const) {
    if (!str((p as any)[k])) return `missing ${k}`;
  }
  return null;
}

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);
  private readonly ready = new WeakSet<object>();

  constructor(
    private readonly notifications: NotificationService,
    private readonly monitor: NotificationDeliveryMonitor,
    private readonly statusAlerts?: PersistentStatusAlertService,
  ) {}

  /** Declares the retry and dead-letter queues on this channel (idempotent; new channel after a reconnect). */
  async ensureTopology(channel: any): Promise<void> {
    if (this.ready.has(channel)) return;
    const retry = (ttl: number) => ({
      durable: true,
      arguments: { 'x-message-ttl': ttl, 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': NOTIFICATION_QUEUE },
    });
    await channel.assertQueue(RETRY_QUEUE_SHORT, retry(RETRY_DELAY_SHORT_MS));
    await channel.assertQueue(RETRY_QUEUE_LONG, retry(RETRY_DELAY_LONG_MS));
    await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
    this.ready.add(channel);
    this.monitor.attach(channel);
  }

  async handle(payload: NotificationPayload, context: RmqContext): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    const attempt = Number(message.properties?.headers?.[ATTEMPT_HEADER] ?? 0) || 0;
    const key = payload?.idempotencyKey ?? null;

    const problem = payloadProblem(payload);
    if (problem) {
      await this.deadLetter(channel, message, attempt, `malformed: ${problem}`, payload, key);
      return;
    }

    // No idempotency key: the original single attempt. A failure part-way through (the row is
    // stored and pushed, then the email fails) cannot be retried without repeating the channels
    // that already went out, so it is logged and acknowledged, exactly as before manual
    // acknowledgment existed. Only keyed notifications record per-channel progress and retry.
    if (!key?.trim()) {
      try {
        await this.notifications.dispatch(payload);
      } catch (err) {
        this.logger.error(`Notification ${payload?.event} (no idempotency key) failed and is not retried: ${describe(err)}`);
      }
      channel.ack(message);
      return;
    }

    try {
      await this.notifications.dispatch(payload);
    } catch (err) {
      const reason = describe(err);
      if (attempt + 1 >= MAX_DELIVERY_ATTEMPTS) {
        await this.deadLetter(channel, message, attempt + 1, reason, payload, key);
      } else {
        await this.retry(channel, message, attempt, reason, payload, key);
      }
      return;
    }
    // Delivered now, or already delivered (duplicate key): either way it is done.
    channel.ack(message);
  }

  async handleStatusAlert(
    payload: PersistentStatusAlertPayload,
    context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    const attempt =
      Number(message.properties?.headers?.[ATTEMPT_HEADER] ?? 0) || 0;
    const key = payload
      ? `${payload.type}:${payload.recipientId}:${payload.occurrenceKey}`
      : null;
    const problem = persistentStatusAlertPayloadProblem(payload);
    if (problem) {
      await this.deadLetter(
        channel,
        message,
        attempt,
        `malformed: ${problem}`,
        payload,
        key,
      );
      return;
    }

    try {
      if (!this.statusAlerts) {
        throw new Error('PersistentStatusAlertService is unavailable');
      }
      await this.statusAlerts.upsert(payload);
    } catch (error) {
      const reason = describe(error);
      if (attempt + 1 >= MAX_DELIVERY_ATTEMPTS) {
        await this.deadLetter(
          channel,
          message,
          attempt + 1,
          reason,
          payload,
          key,
        );
      } else {
        await this.retry(
          channel,
          message,
          attempt,
          reason,
          payload,
          key,
        );
      }
      return;
    }
    channel.ack(message);
  }

  private async retry(channel: any, message: any, attempt: number, reason: string, payload: NotificationPayload | PersistentStatusAlertPayload, key: string | null) {
    const queue = attempt < 2 ? RETRY_QUEUE_SHORT : RETRY_QUEUE_LONG;
    try {
      await this.ensureTopology(channel);
      await this.publish(channel, queue, message, { ...(message.properties?.headers ?? {}), [ATTEMPT_HEADER]: attempt + 1, [FAILURE_HEADER]: reason });
    } catch (err) {
      // The retry could not be stored: keep the original, let the broker redeliver it.
      this.logger.error(`Could not schedule a retry for notification ${'event' in payload ? payload.event : payload.type} (key ${key}): ${describe(err)} - requeueing the original`);
      channel.nack(message, false, true);
      return;
    }
    this.monitor.recordRetry();
    this.logger.warn(`Notification ${'event' in payload ? payload.event : payload.type} (key ${key}) failed on attempt ${attempt + 1}/${MAX_DELIVERY_ATTEMPTS}: ${reason} - retry queued`);
    channel.ack(message);
  }

  private async deadLetter(channel: any, message: any, attempts: number, reason: string, payload: any, key: string | null) {
    const event =
      typeof payload?.event === 'string'
        ? payload.event
        : typeof payload?.type === 'string'
          ? payload.type
          : null;
    try {
      await this.ensureTopology(channel);
      await this.publish(channel, DEAD_LETTER_QUEUE, message, {
        ...(message.properties?.headers ?? {}),
        [ATTEMPT_HEADER]: attempts,
        [FAILURE_HEADER]: reason,
        [FAILED_AT_HEADER]: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error(`Could not dead-letter notification ${event} (key ${key}): ${describe(err)} - requeueing the original`);
      channel.nack(message, false, true);
      return;
    }
    this.monitor.recordDeadLetter({ at: new Date().toISOString(), event, idempotencyKey: key, attempts, reason });
    this.logger.error(`NOTIFICATION DEAD-LETTERED event=${event} key=${key} attempts=${attempts} reason=${reason} (queue ${DEAD_LETTER_QUEUE})`);
    channel.ack(message);
  }

  /** Publishes the original body unchanged to `queue` and resolves once the broker confirmed it. */
  private publish(channel: any, queue: string, message: any, headers: Record<string, unknown>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const options = { persistent: true, contentType: message.properties?.contentType, headers };
      let settled = false;
      const done = (err?: unknown) => {
        if (settled) return;
        settled = true;
        err ? reject(err) : resolve();
      };
      try {
        const result = channel.sendToQueue(queue, message.content, options, (err: unknown) => done(err ?? undefined));
        if (result && typeof result.then === 'function') result.then(() => done(), done);
        else if (typeof channel.waitForConfirms !== 'function') done(); // unconfirmed channel: nothing to wait for
      } catch (err) {
        done(err);
      }
    });
  }
}

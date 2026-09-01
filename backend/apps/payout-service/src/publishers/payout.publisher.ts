// apps/payout-service/src/publishers/payout.publisher.ts
// PS-00 §8.1: Events published by payout-service
//   payout.completed   → earnings-service (PayoutCompletedConsumer)
//   payout.failed      → earnings-service (PayoutFailedConsumer)
//   payout.schedule.updated → earnings-service
// PS-00 §7: RABBITMQ_URL
//
// This was a stub (log-only) with no actual publish. A first attempt used
// amqplib directly against a named topic exchange (marketeq.events, same
// pattern as EarningsPublisher) — that never reached earnings-service:
// checked its queue's real bindings via the RabbitMQ management API and it
// has zero binding to that exchange. The mechanism every other working
// producer in this codebase actually uses (e.g. contracts-service's
// EventsService) is NestJS's own ClientProxy.emit(), which calls
// channel.sendToQueue() straight into the destination queue by name — see
// publishers.module.ts's EARNINGS_RABBITMQ_CLIENT, pointed at
// earnings-service's real inbound queue (earnings.events).
//
// Field-name note: the public methods below keep their existing parameter
// names (payoutRequestId, amount) since every executor/webhook handler in
// this service already calls them that way — the mapping to what
// earnings-service's consumers actually read off the message
// (d.payoutId, d.payoutAmountUsd) happens once, here.
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, defaultIfEmpty } from 'rxjs';
import { randomUUID } from 'crypto';

@Injectable()
export class PayoutPublisher {
  private readonly logger = new Logger(PayoutPublisher.name);

  constructor(
    @Inject('EARNINGS_RABBITMQ_CLIENT') private readonly client: ClientProxy,
  ) {}

  private async emit(pattern: string, payload: object): Promise<void> {
    try {
      // Every consumer in earnings-service (payout-completed.consumer.ts
      // included) is written with @MessagePattern, not @EventPattern —
      // NestJS's RMQ server treats those as two different wire packet
      // types, and only send() produces the one @MessagePattern matches.
      // emit() looked like the semantically-right fire-and-forget choice,
      // but it actually gets NACK'd with "unsupported event" and dropped —
      // confirmed live against earnings-service's own logs. send() still
      // resolves once the handler returns (its Promise<void> becomes the
      // reply), so this behaves as fire-and-wait-for-ack rather than truly
      // fire-and-forget, which is fine here. In practice the reply
      // Observable completes without ever emitting a value (confirmed live,
      // including in a standalone test client) even though the consumer
      // processes the message correctly every time — defaultIfEmpty stops
      // that from being misreported as a failure below.
      await firstValueFrom(this.client.send(pattern, payload).pipe(defaultIfEmpty(null)));
    } catch (err: any) {
      this.logger.error(`Failed to publish ${pattern}: ${err.message}`);
    }
  }

  /**
   * PS-00 §8.1: payout.completed
   * Consumed by: earnings-service (PayoutCompletedConsumer — debits balance,
   * pushes payout_completed to Ably per PS-27 §2.4)
   */
  async publishPayoutCompleted(payload: {
    contractorId: string;
    payoutRequestId: string;
    amount: string;
    currency: string;
    methodType: string;
    settledAt: string;
  }): Promise<void> {
    await this.emit('payout.completed', {
      eventId: randomUUID(),
      contractorId: payload.contractorId,
      payoutId: payload.payoutRequestId,
      payoutAmountUsd: payload.amount,
      currency: payload.currency,
      methodType: payload.methodType,
      settledAt: payload.settledAt,
    });
    this.logger.log(`payout.completed emitted for ${payload.payoutRequestId}`);
  }

  /**
   * PS-00 §8.1: payout.failed
   * Consumed by: earnings-service (PayoutFailedConsumer — restores balance,
   * pushes payout_failed to Ably per PS-27 §2.4)
   */
  async publishPayoutFailed(payload: {
    contractorId: string;
    payoutRequestId: string;
    amount: string;
    currency: string;
    methodType: string;
    reason: string;
    failedAt: string;
  }): Promise<void> {
    await this.emit('payout.failed', {
      eventId: randomUUID(),
      contractorId: payload.contractorId,
      payoutId: payload.payoutRequestId,
      payoutAmountUsd: payload.amount,
      currency: payload.currency,
      methodType: payload.methodType,
      failureReason: payload.reason,
      failedAt: payload.failedAt,
    });
    this.logger.log(`payout.failed emitted for ${payload.payoutRequestId}`);
  }

  /**
   * PS-00 §8.1: payout.schedule.updated
   * Consumed by: earnings-service (invalidate balance cache)
   */
  async publishScheduleUpdated(payload: {
    contractorId: string;
    schedule: object;
    updatedAt: string;
  }): Promise<void> {
    await this.emit('payout.schedule.updated', {
      eventId: randomUUID(),
      ...payload,
    });
    this.logger.log(`payout.schedule.updated emitted for ${payload.contractorId}`);
  }

  /**
   * Not in §8.1 but needed by PS-04 §7.1 — deactivation side-effect
   * Publishes alert when default deposit method removed, pausing scheduled payouts
   */
  async publishPayoutsPaused(contractorId: string, metadata: object): Promise<void> {
    await this.emit('payouts.paused', {
      eventId: randomUUID(),
      contractorId,
      ...metadata,
    });
    this.logger.log(`payouts.paused emitted for ${contractorId}`);
  }
}

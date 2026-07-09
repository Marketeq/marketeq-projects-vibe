// apps/payout-service/src/publishers/payout.publisher.ts
// PS-00 §8.1: Events published by payout-service
//   payout.completed   → marketeq.events — consumed by earnings-service, notification-service
//   payout.failed      → marketeq.events — consumed by earnings-service, notification-service
//   payout.schedule.updated → marketeq.events — consumed by earnings-service
// PS-00 §7: RABBITMQ_URL
// Full implementation in PS-20
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PayoutPublisher {
  private readonly logger = new Logger(PayoutPublisher.name);
  private readonly rabbitmqUrl: string;

  constructor(private readonly config: ConfigService) {
    this.rabbitmqUrl = this.config.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');
  }

  /**
   * PS-00 §8.1: payout.completed
   * Payload: contractorId, payoutRequestId, amount, currency, methodType, settledAt
   * Consumed by: earnings-service (debit balance), notification-service (send notification)
   */
  async publishPayoutCompleted(payload: {
    contractorId: string;
    payoutRequestId: string;
    amount: string;
    currency: string;
    methodType: string;
    settledAt: string;
  }): Promise<void> {
    this.logger.log(`Publishing payout.completed for ${payload.payoutRequestId}`);
    // Full amqplib implementation in PS-20
  }

  /**
   * PS-00 §8.1: payout.failed
   * Payload: contractorId, payoutRequestId, amount, currency, methodType, reason, failedAt
   * Consumed by: earnings-service (restore balance), notification-service (send notification)
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
    this.logger.log(`Publishing payout.failed for ${payload.payoutRequestId}`);
    // Full amqplib implementation in PS-20
  }

  /**
   * PS-00 §8.1: payout.schedule.updated
   * Payload: contractorId, schedule (new config), updatedAt
   * Consumed by: earnings-service (invalidate balance cache)
   */
  async publishScheduleUpdated(payload: {
    contractorId: string;
    schedule: object;
    updatedAt: string;
  }): Promise<void> {
    this.logger.log(`Publishing payout.schedule.updated for ${payload.contractorId}`);
    // Full amqplib implementation in PS-20
  }

  /**
   * Not in §8.1 but needed by PS-04 §7.1 — deactivation side-effect
   * Publishes alert when default deposit method removed, pausing scheduled payouts
   */
  async publishPayoutsPaused(contractorId: string, metadata: object): Promise<void> {
    this.logger.log(`Publishing payouts.paused for ${contractorId}`);
    // Full amqplib implementation in PS-20
  }
}
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService }  from '@nestjs/config';
import * as amqp          from 'amqplib';
import { randomUUID }     from 'crypto';
import { EarningsEventsPublisher } from './earnings-events.publisher';

const EXCHANGE = 'marketeq.events';

@Injectable()
export class EarningsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EarningsPublisher.name);
  private connection: any;
  private channel:    any;

  constructor(
    private readonly config: ConfigService,
    private readonly realtimeEvents: EarningsEventsPublisher,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) { this.logger.warn('RABBITMQ_URL not set — publisher disabled'); return; }
    try {
      const confirm = this.config.get('PUBLISHER_CONFIRM', 'true') === 'true';
      this.connection = await (amqp as any).connect(url);
      this.channel = confirm
        ? await this.connection.createConfirmChannel()
        : await this.connection.createChannel();
      await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      this.logger.log(`EarningsPublisher connected — confirms: ${confirm}`);
    } catch (err) {
      this.logger.error(`Failed to connect publisher: ${err.message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch { /* ignore close errors on shutdown */ }
  }

  private publish(routingKey: string, payload: object): Promise<void> {
    if (!this.channel) {
      this.logger.warn(`Cannot publish ${routingKey} — channel not connected`);
      return Promise.resolve();
    }
    const envelope = {
      ...payload,
      eventId:     randomUUID(),
      publishedAt: new Date().toISOString(),
      source:      'earnings-service',
    };
    const content = Buffer.from(JSON.stringify(envelope));
    const options = { persistent: true, contentType: 'application/json' };
    return new Promise((resolve, reject) => {
      const sent = this.channel.publish(EXCHANGE, routingKey, content, options,
        (err: any) => err ? reject(err) : resolve(),
      );
      if (!sent) reject(new Error('RabbitMQ channel buffer full — backpressure'));
    });
  }

  async publishBalanceUpdated(payload: BalanceUpdatedPayload): Promise<void> {
    await this.publish('earnings.balance.updated', payload);
    this.logger.log(`earnings.balance.updated published for ${payload.contractorId}`);
    // US-91–94: same mutation, pushed live to the contractor's own Ably
    // channel. Every caller of publishBalanceUpdated (credit/debit/reversal/
    // payout_completed/payout_failed) gets real-time fan-out for free — no
    // need to touch the four RabbitMQ consumers individually.
    await this.realtimeEvents.publishRealtimeBalanceUpdate(payload);
  }

  async publishThresholdReached(payload: ThresholdReachedPayload): Promise<void> {
    await this.publish('earnings.threshold.reached', payload);
    this.logger.log(
      `earnings.threshold.reached published for ${payload.contractorId} — ` +
      `YTD: ${payload.ytdTotalUsd} year: ${payload.year}`,
    );
  }
}

export interface BalanceUpdatedPayload {
  contractorId:       string;
  availableBalance:   string;
  previousBalance:    string;
  delta:              string;
  mutationType:       'credit' | 'debit' | 'reversal' | 'payout_completed' | 'payout_failed';
  sourceEventId:      string;
  sourceRoutingKey:   string;
  displayCurrency:    string;
  localCurrency:      string;
  mutationAt:         string;
}

export interface ThresholdReachedPayload {
  contractorId:   string;
  year:           number;
  ytdTotalUsd:    string;
  thresholdUsd:   number;
  crossedAt:      string;
}

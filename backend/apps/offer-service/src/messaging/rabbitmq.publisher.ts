// apps/offer-service/src/messaging/rabbitmq.publisher.ts
// OS-19: Declares full topology at startup, publishes with confirm channel.
import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';
import {
  RABBITMQ_CLIENT,
  OFFER_EXCHANGE, OFFER_DLX,
  QUEUE_CONTRACTS, QUEUE_NOTIFICATIONS, QUEUE_MESSAGING,
  DLQ_CONTRACTS, DLQ_NOTIFICATIONS, DLQ_MESSAGING,
  DLX_KEY_CONTRACTS, DLX_KEY_NOTIFICATIONS, DLX_KEY_MESSAGING,
  QUEUE_BINDINGS, DLQ_MESSAGE_TTL_MS,
  OfferRoutingKey,
} from './constants/rabbitmq.constants';

export interface RabbitMQMessage {
  routingKey: OfferRoutingKey;
  payload: Record<string, unknown>;
}

@Injectable()
export class RabbitMQPublisher implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQPublisher.name);
  private channel: amqp.ConfirmChannel | null = null;

  constructor(
    @Inject(RABBITMQ_CLIENT)
    private readonly connection: any,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.connection) {
      this.logger.warn('RabbitMQ not available — publisher disabled');
      return;
    }
    this.channel = await this.connection.createConfirmChannel();
    this.channel!.on('error', (err: Error) => {
      this.logger.error('Channel error:', err.message);
    });
    await this.declareTopology();
    this.logger.log('RabbitMQ topology declared. Publisher ready.');
  }

  private async declareTopology(): Promise<void> {
    if (!this.channel) return;
    await this.channel.assertExchange(OFFER_EXCHANGE, 'topic', { durable: true, autoDelete: false });
    await this.channel.assertExchange(OFFER_DLX, 'direct', { durable: true, autoDelete: false });

    for (const [dlq, dlxKey] of [
      [DLQ_CONTRACTS, DLX_KEY_CONTRACTS],
      [DLQ_NOTIFICATIONS, DLX_KEY_NOTIFICATIONS],
      [DLQ_MESSAGING, DLX_KEY_MESSAGING],
    ] as const) {
      await this.channel.assertQueue(dlq, {
        durable: true, autoDelete: false,
        arguments: { 'x-message-ttl': DLQ_MESSAGE_TTL_MS },
      });
      await this.channel.bindQueue(dlq, OFFER_DLX, dlxKey);
    }

    for (const { name, dlxKey } of [
      { name: QUEUE_CONTRACTS, dlxKey: DLX_KEY_CONTRACTS },
      { name: QUEUE_NOTIFICATIONS, dlxKey: DLX_KEY_NOTIFICATIONS },
      { name: QUEUE_MESSAGING, dlxKey: DLX_KEY_MESSAGING },
    ]) {
      await this.channel.assertQueue(name, {
        durable: true, autoDelete: false,
        arguments: {
          'x-dead-letter-exchange': OFFER_DLX,
          'x-dead-letter-routing-key': dlxKey,
        },
      });
    }

    for (const [queueName, routingKeys] of Object.entries(QUEUE_BINDINGS)) {
      for (const routingKey of routingKeys) {
        await this.channel.bindQueue(queueName, OFFER_EXCHANGE, routingKey);
      }
    }

    this.logger.log(`Topology declared: ${OFFER_EXCHANGE} + 3 queues + 3 DLQs`);
  }

  async publish(message: RabbitMQMessage): Promise<void> {
    if (!this.channel) {
      this.logger.debug(`[STUB] RabbitMQ publish skipped: ${message.routingKey}`);
      return;
    }
    const { routingKey, payload } = message;
    return new Promise((resolve, reject) => {
      const content = Buffer.from(JSON.stringify(payload));
      const options: amqp.Options.Publish = {
        persistent: true,
        contentType: 'application/json',
        contentEncoding: 'utf-8',
        timestamp: Math.floor(Date.now() / 1000),
        headers: {
          'x-event-type': routingKey,
          'x-service-origin': 'offer-service',
        },
      };

      this.channel!.publish(OFFER_EXCHANGE, routingKey, content, options, (err) => {
        if (err) {
          this.logger.error(`Publish nacked for ${routingKey}:`, err.message);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async publishBatch(messages: RabbitMQMessage[]): Promise<void> {
    await Promise.all(messages.map(m => this.publish(m)));
  }

  isReady(): boolean {
    try {
      return !!this.channel;
    } catch {
      return false;
    }
  }
}
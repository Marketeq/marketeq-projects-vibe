import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { NotificationEventPublisher } from './notification-event-publisher.interface';
import { IdentityVerificationEvent } from './identity-verification-event.types';

const EXCHANGE_NAME = 'identity-verification.events';

@Injectable()
export class RabbitMqNotificationEventPublisher implements NotificationEventPublisher, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqNotificationEventPublisher.name);
  private connection: amqplib.Connection | null = null;
  private channel: amqplib.Channel | null = null;
  private connecting: Promise<amqplib.Channel> | null = null;

  private async getChannel(): Promise<amqplib.Channel> {
    if (this.channel) return this.channel;
    if (!this.connecting) {
      this.connecting = (async () => {
        const conn = (await amqplib.connect(process.env.RABBITMQ_URL as string)) as any;
        this.connection = conn;
        const ch = await conn.createChannel();
        await ch.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        this.channel = ch;
        return ch;
      })();
    }
    return this.connecting;
  }

  async publish(event: IdentityVerificationEvent): Promise<void> {
    try {
      const channel = await this.getChannel();
      const routingKey = `identity-verification.${event.eventType}`;
      channel.publish(
        EXCHANGE_NAME,
        routingKey,
        Buffer.from(JSON.stringify(event)),
        { contentType: 'application/json', persistent: true },
      );
    } catch (err) {
      this.logger.error(`Failed to publish ${event.eventType}: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channel) {
      try {
        await this.channel.close();
      } catch (err) {
        this.logger.error('Error closing RabbitMQ channel', err);
      }
    }
    if (this.connection) {
      try {
        await (this.connection as any).close();
      } catch (err) {
        this.logger.error('Error closing RabbitMQ connection', err);
      }
    }
  }
}

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
      // Cleared once settled, so a refused connect (the broker at its
      // connection limit, e.g. during a deploy's switchover) is retried on the
      // next publish. Before, every later publish re-awaited the same rejected
      // promise and failed until the process restarted (seen 2026-10-23).
      this.connecting = (async () => {
        const conn = (await amqplib.connect(process.env.RABBITMQ_URL as string)) as any;
        try {
          // amqplib crashes the process on an 'error' event with no listener.
          // On close, drop the cached handles so the next publish reconnects
          // instead of writing to a dead channel.
          conn.on('error', (err: Error) => this.logger.error(`RabbitMQ connection error: ${err.message}`));
          conn.on('close', () => this.clearHandles());
          const ch = await conn.createChannel();
          ch.on('error', (err: Error) => this.logger.error(`RabbitMQ channel error: ${err.message}`));
          ch.on('close', () => {
            this.clearHandles();
            conn.close().catch(() => undefined);
          });
          await ch.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
          this.connection = conn;
          this.channel = ch;
          return ch;
        } catch (err) {
          // Close a half-open connection so retries don't each hold one of the
          // broker's limited connections.
          await conn.close().catch(() => undefined);
          throw err;
        }
      })().finally(() => {
        this.connecting = null;
      });
    }
    return this.connecting;
  }

  private clearHandles(): void {
    this.channel = null;
    this.connection = null;
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

import { Injectable, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  private readonly exchangeName = 'identity_verification_events';

  async onModuleInit() {
    try {
      await this.connect();
    } catch (error) {
      this.logger.warn('Failed to connect to RabbitMQ on init', error);
    }
  }

  async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }

  private async connect() {
    this.connection = await amqp.connect(this.rabbitmqUrl);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
    this.logger.log('Connected to RabbitMQ');
  }

  async publishLocationVerified(userId: string, country: string): Promise<void> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const message = {
        userId,
        country,
        timestamp: new Date().toISOString(),
        event: 'location_verified',
      };

      await this.channel.publish(
        this.exchangeName,
        'location.verified',
        Buffer.from(JSON.stringify(message)),
        { persistent: true },
      );

      this.logger.log(`Published location verified event for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to publish location verified event', error);
    }
  }

  async publishIdentityVerified(userId: string, verificationDepth: string): Promise<void> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const message = {
        userId,
        verificationDepth,
        timestamp: new Date().toISOString(),
        event: 'identity_verified',
      };

      await this.channel.publish(
        this.exchangeName,
        'identity.verified',
        Buffer.from(JSON.stringify(message)),
        { persistent: true },
      );

      this.logger.log(`Published identity verified event for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to publish identity verified event', error);
    }
  }

  async publishVerificationSubmitted(userId: string, documentType: string): Promise<void> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const message = {
        userId,
        documentType,
        timestamp: new Date().toISOString(),
        event: 'verification_submitted',
      };

      await this.channel.publish(
        this.exchangeName,
        'verification.submitted',
        Buffer.from(JSON.stringify(message)),
        { persistent: true },
      );

      this.logger.log(`Published verification submitted event for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to publish verification submitted event', error);
    }
  }

  async publishTravelModeActivated(userId: string, declaredDuration: string): Promise<void> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const message = {
        userId,
        declaredDuration,
        timestamp: new Date().toISOString(),
        event: 'travel_mode_activated',
      };

      await this.channel.publish(
        this.exchangeName,
        'travel.mode_activated',
        Buffer.from(JSON.stringify(message)),
        { persistent: true },
      );

      this.logger.log(`Published travel mode activated event for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to publish travel mode activated event', error);
    }
  }

  async publishHomeCountryUpdated(userId: string, newCountry: string, oldCountry?: string): Promise<void> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const message = {
        userId,
        newCountry,
        oldCountry,
        timestamp: new Date().toISOString(),
        event: 'home_country_updated',
      };

      await this.channel.publish(
        this.exchangeName,
        'location.home_country_updated',
        Buffer.from(JSON.stringify(message)),
        { persistent: true },
      );

      this.logger.log(`Published home country updated event for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to publish home country updated event', error);
    }
  }
}

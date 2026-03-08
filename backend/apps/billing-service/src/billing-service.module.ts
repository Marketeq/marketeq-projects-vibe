import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BillingSubscription } from './entities/subscription.entity';
import { BillingInvoice } from './entities/invoice.entity';
import { PaymentRetryLog } from './entities/payment-retry-log.entity';
import { BillingService } from './services/billing.service';
import { StripeSubscriptionService } from './services/stripe-subscription.service';
import { EventsService } from './services/events.service';
import { BillingController } from './controllers/billing.controller';
import { WebhooksController } from './controllers/webhooks.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [BillingSubscription, BillingInvoice, PaymentRetryLog],
        synchronize: config.get('NODE_ENV') !== 'production',
        ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature([BillingSubscription, BillingInvoice, PaymentRetryLog]),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URI') || 'amqp://localhost:5672'],
            queue: 'billing_events_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [BillingController, WebhooksController],
  providers: [BillingService, StripeSubscriptionService, EventsService],
})
export class BillingServiceModule {}

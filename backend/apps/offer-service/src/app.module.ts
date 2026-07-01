// apps/offer-service/src/app.module.ts
// OS-08 + OS-09: Root module — wires Joi validation + typed config namespace
// OS-23: Uncommented RealtimeModule for Ably real-time integration
// OS-26: Uncommented SchedulerModule for expiry + warning cron processors
// OS-29: Added IntegrationsModule for downstream service HTTP clients
// OS-35: Replaced HealthModule with full readiness probe, added OfferLoggerService
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
// import { HttpModule } from '@nestjs/axios';
import { AuthModule } from '@libs/auth';

// OS-09: Config
import { offerConfig, OfferConfig } from './config/offer.config';
import { validationSchema } from './config/validation.schema';

// Entities
import { Offer } from './offers/entities/offer.entity';
import { CounterOffer } from './counter-offers/entities/counter-offer.entity';
import { OfferHistoryEvent } from './offer-history/entities/offer-history-event.entity';
import { OutboxEvent } from './outbox/entities/outbox-event.entity';

// Feature modules
import { OffersModule } from './offers/offers.module';
import { CounterOffersModule } from './counter-offers/counter-offers.module';
import { OfferHistoryModule } from './offer-history/offer-history.module';
import { OutboxModule } from './outbox/outbox.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { MessagingModule } from './messaging/messaging.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { RealtimeModule } from './realtime/realtime.module';
import { HealthModule } from './health/health.module';
import { OfferLoggerService } from './common/logger/offer-logger.service';
import { RedisModule } from './redis/redis.module';
import { AlertModule } from './common/alert/alert.module';

@Module({
  imports: [
    // OS-09: ConfigModule with Joi validation + typed namespace
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: '.env',
      validationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: false,
      },
      load: [offerConfig],
    }),

    AuthModule,
    RedisModule,
    AlertModule,

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const cfg = config.get<OfferConfig>('offer')!;
        return {
          type: 'postgres' as const,
          url: cfg.db.url,
          ssl: cfg.db.ssl ? { rejectUnauthorized: false } : false,
          entities: [Offer, CounterOffer, OfferHistoryEvent, OutboxEvent],
          schema: 'offer_service',
          synchronize: false,
          logging: cfg.app.isDevelopment,
          retryAttempts: 3,
          retryDelay: 2000,
          extra: {
            max: cfg.db.maxConnections,
            connectionTimeoutMillis: 5000,
          },
        };
      },
    }),

    ScheduleModule.forRoot(),
    // HttpModule,

    // Feature modules
    RealtimeModule,    // OS-23: @Global() — AblyService injectable everywhere
    IntegrationsModule, // OS-29: @Global() — ListingsClient, PricingClient, LegalClient
    SchedulerModule,   // OS-26: Expiry + Warning cron processors
    OffersModule,
    CounterOffersModule,
    OfferHistoryModule,
    OutboxModule,
    MessagingModule,
    HealthModule,
  ],
  providers: [OfferLoggerService],
  exports: [OfferLoggerService],
})
export class AppModule {}
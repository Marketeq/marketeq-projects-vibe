import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';
import { Notification } from './entities/notification.entity';
import { UserPreference } from './entities/user-preference.entity';
import { NotificationIdempotency } from './entities/notification-idempotency.entity';
import { PersistentStatusAlert } from './entities/persistent-status-alert.entity';
import { NotificationService } from './services/notification.service';
import { NotificationController } from './controllers/notification.controller';
import { AblyNotificationsService } from './ably/ably-notifications.service';
import { BrevoService } from './brevo/brevo.service';
import { NotificationDeliveryService } from './delivery/notification-delivery.service';
import { NotificationDeliveryMonitor } from './delivery/notification-delivery-monitor';
import { SupportController } from './support/support.controller';
import { SupportService } from './support/support.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PersistentStatusAlertService } from './services/persistent-status-alert.service';
import { OfferCreatedSubscriber } from './subscribers/offer-created.subscriber';
import { UserServiceClient } from './clients/user-service.client';

function resolveDatabaseSsl(config: ConfigService) {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const rawSsl = String(
    config.get<string>('DATABASE_SSL') ??
      config.get<string>('DATABASE_SSL_ENABLED') ??
      '',
  ).toLowerCase();

  if (rawSsl === 'true') {
    return { rejectUnauthorized: false };
  }

  if (rawSsl === 'false') {
    return false;
  }

  return isProd ? { rejectUnauthorized: false } : false;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/notification-service/.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        schema: config.get<string>('DATABASE_SCHEMA') || 'public',
        entities: [Notification, UserPreference, NotificationIdempotency, PersistentStatusAlert],
        synchronize: false,
        migrationsRun: true,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        ssl: resolveDatabaseSsl(config),
      }),
    }),
    TypeOrmModule.forFeature([Notification, UserPreference, NotificationIdempotency, PersistentStatusAlert]),
    HttpModule,
  ],
  controllers: [NotificationController, SupportController],
  providers: [
    NotificationService,
    NotificationDeliveryService,
    NotificationDeliveryMonitor,
    AblyNotificationsService,
    BrevoService,
    SupportService,
    PersistentStatusAlertService,
    OfferCreatedSubscriber,
    UserServiceClient,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class NotificationServiceModule {}

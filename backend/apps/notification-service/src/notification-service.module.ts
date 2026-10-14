import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Notification } from './entities/notification.entity';
import { UserPreference } from './entities/user-preference.entity';
import { NotificationIdempotency } from './entities/notification-idempotency.entity';
import { NotificationService } from './services/notification.service';
import { NotificationController } from './controllers/notification.controller';
import { AblyNotificationsService } from './ably/ably-notifications.service';
import { BrevoService } from './brevo/brevo.service';
import { SupportController } from './support/support.controller';
import { SupportService } from './support/support.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
        entities: [Notification, UserPreference, NotificationIdempotency],
        synchronize: false,
        migrationsRun: true,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        ssl: resolveDatabaseSsl(config),
      }),
    }),
    TypeOrmModule.forFeature([Notification, UserPreference, NotificationIdempotency]),
  ],
  controllers: [NotificationController, SupportController],
  providers: [
    NotificationService,
    AblyNotificationsService,
    BrevoService,
    SupportService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class NotificationServiceModule {}

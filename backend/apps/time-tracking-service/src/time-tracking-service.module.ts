import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { Screenshot } from './entities/screenshot.entity';
import { ManualTime } from './entities/manual-time.entity';
import { AdminSettings } from './entities/admin-settings.entity';
import { UserPreferences } from './entities/user-preferences.entity';

import { ScreenshotsService } from './services/screenshots.service';
import { ManualTimeService } from './services/manual-time.service';
import { SettingsService } from './services/settings.service';
import { EventsService } from './services/events.service';

import { ScreenshotsController } from './controllers/screenshots.controller';
import { ManualTimeController } from './controllers/manual-time.controller';
import { SettingsController } from './controllers/settings.controller';
import { MetadataController } from './controllers/metadata.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [Screenshot, ManualTime, AdminSettings, UserPreferences],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        ssl:
          config.get<string>('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    TypeOrmModule.forFeature([Screenshot, ManualTime, AdminSettings, UserPreferences]),

    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URI') ?? 'amqp://localhost:5672'],
            queue: 'time_tracking_events',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [
    ScreenshotsController,
    ManualTimeController,
    SettingsController,
    MetadataController,
  ],
  providers: [
    ScreenshotsService,
    ManualTimeService,
    SettingsService,
    EventsService,
  ],
})
export class TimeTrackingServiceModule {}

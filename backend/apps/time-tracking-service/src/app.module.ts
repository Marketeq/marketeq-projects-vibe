import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivityWatchModule } from './activitywatch.module';
import { HealthModule } from './health/health.module';
import { ScreenshotsModule } from './screenshots/screenshots.module';
import { StorageModule } from './storage/storage.module';
import { TimelineModule } from './timeline/timeline.module';
import { ManualTimeModule } from './manual-time/manual-time.module';
import { SettingsModule } from './settings/settings.module';
import { TooltipsModule } from './tooltips/tooltips.module';
import { TasksModule } from './tasks/tasks.module';
import { SessionsModule } from './sessions/sessions.module';
import { TimeTrackingConsumer } from './consumers/time-tracking.consumer';

// Entities for TypeORM root registration
import { ActivityWatchEvent } from './entities/activity-watch-event.entity';
import { Screenshot } from './screenshots/screenshots.entity';
import { ManualTime } from './entities/manual-time.entity';
import { AdminSettings } from './entities/admin-settings.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { Tooltip } from './tooltips/tooltip.entity';
import { ContractTask } from './entities/contract-task.entity';
import { Session } from './sessions/session.entity';

import { TimeEntriesModule } from './time-entries/time-entries.module';
import { BreaksModule } from './breaks/breaks.module';
import { IdlesModule } from './idles/idles.module';
import { ActivityModule } from './activity/activity.module';
import { DisputesModule } from './disputes/disputes.module';
import { DevicesModule } from './devices/devices.module';
import { TimeEntry } from './entities/time-entry.entity';
import { BreakEvent } from './entities/break-event.entity';
import { IdleEvent } from './entities/idle-event.entity';
import { ActivityMinute } from './entities/activity-minute.entity';
import { Dispute } from './entities/dispute.entity';
import { DeviceRegistration } from './entities/device-registration.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/time-tracking-service/.env', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        const rawSsl =
          (config.get<string>('DATABASE_SSL') ??
            config.get<string>('DATABASE_SSL_ENABLED') ??
            '').toLowerCase();
        const useSSL = rawSsl === 'true' ? true : rawSsl === 'false' ? false : isProd;
        return {
          type: 'postgres' as const,
          url: config.get<string>('DATABASE_URL') ?? 'postgres://postgres:password@localhost:5432/marketeq',
          entities: [ActivityWatchEvent, Screenshot, ManualTime, AdminSettings, UserPreferences, Tooltip, ContractTask, Session, TimeEntry, BreakEvent, IdleEvent, ActivityMinute, Dispute, DeviceRegistration],
          synchronize: false,
          migrationsRun: true,
          migrations: [
            __dirname + '/../migrations/*{.ts,.js}',
            __dirname + '/migrations/*{.ts,.js}',
          ],
          schema: 'time_tracking',
          logging: !isProd,
          ssl: useSSL ? { rejectUnauthorized: false } : undefined,
          extra: useSSL ? { sslmode: 'require' } : undefined,
        };
      },
    }),

    ActivityWatchModule,
    HealthModule,
    ScreenshotsModule,
    StorageModule,
    TimelineModule,
    ManualTimeModule,
    SettingsModule,
    TooltipsModule,
    TasksModule,
    SessionsModule,
    TimeEntriesModule,
    BreaksModule,
    IdlesModule,
    ActivityModule,
    DisputesModule,
    DevicesModule,
  ],
  controllers: [TimeTrackingConsumer],
})
export class AppModule {}

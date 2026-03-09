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

import { MetadataController } from './controllers/metadata.controller';

// Entities for TypeORM root registration
import { ActivityWatchEvent } from './entities/activity-watch-event.entity';
import { Screenshot } from './screenshots/screenshots.entity';
import { ManualTime } from './entities/manual-time.entity';
import { AdminSettings } from './entities/admin-settings.entity';
import { UserPreferences } from './entities/user-preferences.entity';

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
        return {
          type: 'postgres' as const,
          url: config.get<string>('DATABASE_URL') ?? 'postgres://postgres:password@localhost:5432/marketeq',
          entities: [ActivityWatchEvent, Screenshot, ManualTime, AdminSettings, UserPreferences],
          synchronize: false,
          schema: 'public',
          logging: !isProd,
          ssl: isProd ? { rejectUnauthorized: false } : undefined,
          extra: isProd ? { sslmode: 'require' } : undefined,
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
  ],
  controllers: [MetadataController],
})
export class AppModule {}

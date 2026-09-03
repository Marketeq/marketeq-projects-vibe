import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BrowsingHistory } from './entities/browsing-history.entity';
import { BrowsingHistoryService } from './services/browsing-history.service';
import { BrowsingHistoryController } from './controllers/browsing-history.controller';
import { HealthController } from './health/health.controller';
import { BrowsingHistoryCleanupTask } from './cleanup/browsing-history-cleanup.task';
import {
  ListingOwnerTargetClientAdapter,
  UserOwnerTargetClientAdapter,
} from './services/owner-target-client.adapter';
import {
  LISTING_OWNER_TARGET_CLIENT,
  USER_OWNER_TARGET_CLIENT,
} from './services/owner-target-client.port';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        schema: config.get<string>('DATABASE_SCHEMA') || 'public',
        entities: [BrowsingHistory],
        // Permanent guardrail: schema changes must go through migrations.
        synchronize: false,
        migrationsRun: true,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        logging: process.env.NODE_ENV !== 'production',
        ssl:
          (config.get('DATABASE_SSL_ENABLED') ?? 'false').toString().toLowerCase() === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    TypeOrmModule.forFeature([BrowsingHistory]),
    ScheduleModule.forRoot(),
  ],
  controllers: [BrowsingHistoryController, HealthController],
  providers: [
    BrowsingHistoryService,
    BrowsingHistoryCleanupTask,
    {
      provide: LISTING_OWNER_TARGET_CLIENT,
      useClass: ListingOwnerTargetClientAdapter,
    },
    {
      provide: USER_OWNER_TARGET_CLIENT,
      useClass: UserOwnerTargetClientAdapter,
    },
  ],
})
export class BrowsingHistoryServiceModule {}

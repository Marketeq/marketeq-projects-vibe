import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ContentValidationService } from './filters/content-validation.service';
import { ProfanityFilterService } from './filters/profanity-filter.service';
import { BannedKeywordsService } from './filters/banned-keywords.service';
import { MediaModerationService } from './filters/media-moderation.service';
import { FileValidationService } from './filters/file-validation.service';
import { ContentModerationController } from './content-moderation.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ModerationController } from './moderation.controller';
import { ModerationLogService } from './moderation-log.service';
import { ContentModerationService } from './filters/content-moderation.service';
import { ContentRepository } from './filters/content.repository';
import { ContentFilter } from './filters/content.filter';
import { NotificationService } from './notification.service';
import { RoleValidationService } from './filters/role-validation.service';
import { SkillValidationService } from './filters/skill-validation.service';
import { LocationValidationService } from './filters/location-validation.service';
import { AdminController } from './admin.controller';
import { AutocompleteService } from './autocomplete.service';
import { AutocompleteValidationService } from './filters/autocomplete-validation.service';
import { ImageModerationService } from './filters/image-moderation.service';
import { ImageModerationController } from './filters/image-moderation.controller';
import { ModerationService } from './moderation.service';
import { ModerationLog } from './entities/moderation-log.entity';
import { BannedKeyword } from './entities/banned-keyword.entity';
import { Appeal } from './entities/appeal.entity';
import { AppealService } from './services/appeal.service';
import { AppealController } from './controllers/appeal.controller';
import { ModerationReportService } from './services/report.service';
import { ReportController } from './controllers/report.controller';
import { ModerationEventsService } from './services/moderation-events.service';

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/content-moderation-service/.env',
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(process.env.DATABASE_URL
        ? { url: process.env.DATABASE_URL }
        : {
            host: process.env.DATABASE_HOST,
            port: parseInt(process.env.DATABASE_PORT || '5432', 10),
            username: process.env.DATABASE_USERNAME,
            password: process.env.DATABASE_PASSWORD,
            database: process.env.DATABASE_NAME,
          }),
      ...(process.env.DATABASE_SSL_ENABLED === 'true'
        ? { ssl: { rejectUnauthorized: false } }
        : {}),
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: true,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
    }),
    TypeOrmModule.forFeature([ModerationLog, BannedKeyword, Appeal]),
  ],

  controllers: [
    AppController,
    ContentModerationController,
    ModerationController,
    AdminController,
    ImageModerationController,
    AppealController,
    ReportController,
  ],

  providers: [
    AppService,
    ContentValidationService,
    ProfanityFilterService,
    BannedKeywordsService,
    MediaModerationService,
    FileValidationService,
    ModerationLogService,
    ContentModerationService,
    ContentRepository,
    ContentFilter,
    NotificationService,
    RoleValidationService,
    SkillValidationService,
    LocationValidationService,
    AutocompleteService,
    AutocompleteValidationService,
    ImageModerationService,
    ModerationService,
    AppealService,
    ModerationReportService,
    ModerationEventsService,
  ],
})
export class AppModule {}

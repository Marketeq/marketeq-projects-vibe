import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { NotificationService } from './notification.service';
import { RoleValidationService } from './filters/role-validation.service';
import { SkillValidationService } from './filters/skill-validation.service';
import { LocationValidationService } from './filters/location-validation.service';
import { AdminController } from './admin.controller';
import { AutocompleteService } from './autocomplete.service';
import { AutocompleteValidationService } from './filters/autocomplete-validation.service';
import { ImageModerationService } from './filters/image-moderation.service';
import { ImageModerationController } from './filters/image-moderation.controller';

import { ConfigModule } from '@nestjs/config'; 

console.log('DATABASE_PASSWORD:', process.env.DATABASE_PASSWORD);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/content-moderation-service/.env',

    }),

   
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
    }),
  ],

  controllers: [
    AppController,
    ContentModerationController,
    ModerationController,
    AdminController,
    ImageModerationController
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
    NotificationService,
    RoleValidationService,
    SkillValidationService,
    LocationValidationService,
    AutocompleteService,
    AutocompleteValidationService,
    ImageModerationService
  ],
})
export class AppModule {}
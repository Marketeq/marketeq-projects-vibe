import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationLog } from './entities/moderation-log.entity';
import { BannedKeyword } from './entities/banned-keyword.entity';
import { ContentFilter } from './filters/content.filter';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [ModerationLog, BannedKeyword],
        synchronize: config.get('NODE_ENV') !== 'production',
        ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature([ModerationLog, BannedKeyword]),
  ],
  controllers: [ModerationController],
  providers: [ModerationService, ContentFilter],
})
export class ContentModerationServiceModule {}

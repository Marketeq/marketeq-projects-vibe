import { TalentNotificationsModule } from '../notifications/talent-notifications.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { EventsModule } from '../services/events.module';
import { Screenshot } from './screenshots.entity';
import { AdminSettings } from '../entities/admin-settings.entity';
import { ScreenshotsController } from './screenshots.controller';
import { ScreenshotsDevController } from './screenshots.dev.controller';
import { ScreenshotsService } from './screenshots.service';
import { BearerGuard } from '../common/guards/bearer.guard';
import { EarningsSyncService } from '../services/earnings-sync.service';
import { ScreenshotImageService } from './screenshot-image.service';

const devControllers =
  process.env.NODE_ENV !== 'production' ? [ScreenshotsDevController] : [];

@Module({
  imports: [
    StorageModule,
    EventsModule,
    TalentNotificationsModule,
    TypeOrmModule.forFeature([Screenshot, AdminSettings]),
  ],
  controllers: [ScreenshotsController, ...devControllers],
  providers: [ScreenshotsService, ScreenshotImageService, BearerGuard, EarningsSyncService],
  exports: [ScreenshotsService, EarningsSyncService],
})
export class ScreenshotsModule {}

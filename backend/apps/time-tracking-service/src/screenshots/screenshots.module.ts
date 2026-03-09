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

const devControllers =
  process.env.NODE_ENV !== 'production' ? [ScreenshotsDevController] : [];

@Module({
  imports: [StorageModule, EventsModule, TypeOrmModule.forFeature([Screenshot, AdminSettings])],
  controllers: [ScreenshotsController, ...devControllers],
  providers: [ScreenshotsService, BearerGuard],
  exports: [ScreenshotsService],
})
export class ScreenshotsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Screenshot } from './screenshot.entity';
import { ScreenshotsService } from './screenshots.service';
import { ScreenshotsController } from './screenshots.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Screenshot])],
  controllers: [ScreenshotsController],
  providers: [ScreenshotsService],
  exports: [ScreenshotsService],
})
export class ScreenshotsModule {}

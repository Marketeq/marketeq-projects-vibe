import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';
import { Screenshot } from '../screenshots/screenshots.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Screenshot])],
  controllers: [TimelineController],
  providers: [TimelineService],
  exports: [TimelineService],
})
export class TimelineModule {}

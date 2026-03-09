import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityWatchController } from './activitywatch.controller';
import { ActivityWatchService } from './activitywatch.service';
import { ActivityWatchEvent } from './entities/activity-watch-event.entity';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([ActivityWatchEvent])],
  controllers: [ActivityWatchController],
  providers: [ActivityWatchService],
  exports: [ActivityWatchService],
})
export class ActivityWatchModule {}

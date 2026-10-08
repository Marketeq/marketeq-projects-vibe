import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManualTime } from '../entities/manual-time.entity';
import { ManualTimeService } from '../services/manual-time.service';
import { ManualTimeController } from '../controllers/manual-time.controller';
import { EventsModule } from '../services/events.module';
import { TalentNotificationsModule } from '../notifications/talent-notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([ManualTime]), EventsModule, TalentNotificationsModule],
  controllers: [ManualTimeController],
  providers: [ManualTimeService],
  exports: [ManualTimeService],
})
export class ManualTimeModule {}

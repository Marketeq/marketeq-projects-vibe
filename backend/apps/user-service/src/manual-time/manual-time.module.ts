import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManualTimeEntry } from './manual-time-entry.entity';
import { ManualTimeService } from './manual-time.service';
import { ManualTimeController } from './manual-time.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ManualTimeEntry])],
  controllers: [ManualTimeController],
  providers: [ManualTimeService],
  exports: [ManualTimeService],
})
export class ManualTimeModule {}

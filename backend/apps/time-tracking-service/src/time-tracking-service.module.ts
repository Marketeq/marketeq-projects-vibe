import { Module } from '@nestjs/common';
import { UtimeUtrackingUserviceController } from './time-tracking-service.controller';
import { UtimeUtrackingUserviceService } from './time-tracking-service.service';

@Module({
  imports: [],
  controllers: [UtimeUtrackingUserviceController],
  providers: [UtimeUtrackingUserviceService],
})
export class UtimeUtrackingUserviceModule {}

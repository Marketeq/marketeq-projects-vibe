import { Module } from '@nestjs/common';
import { UnotificationUserviceController } from './notification-service.controller';
import { UnotificationUserviceService } from './notification-service.service';

@Module({
  imports: [],
  controllers: [UnotificationUserviceController],
  providers: [UnotificationUserviceService],
})
export class UnotificationUserviceModule {}

import { Module } from '@nestjs/common';
import { UmessagingUserviceController } from './messaging-service.controller';
import { UmessagingUserviceService } from './messaging-service.service';

@Module({
  imports: [],
  controllers: [UmessagingUserviceController],
  providers: [UmessagingUserviceService],
})
export class UmessagingUserviceModule {}

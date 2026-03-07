import { Module } from '@nestjs/common';
import { UcontentUmoderationUserviceController } from './content-moderation-service.controller';
import { UcontentUmoderationUserviceService } from './content-moderation-service.service';

@Module({
  imports: [],
  controllers: [UcontentUmoderationUserviceController],
  providers: [UcontentUmoderationUserviceService],
})
export class UcontentUmoderationUserviceModule {}

import { Module } from '@nestjs/common';
import { UlistingsUserviceController } from './listings-service.controller';
import { UlistingsUserviceService } from './listings-service.service';

@Module({
  imports: [],
  controllers: [UlistingsUserviceController],
  providers: [UlistingsUserviceService],
})
export class UlistingsUserviceModule {}

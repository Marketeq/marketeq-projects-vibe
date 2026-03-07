import { Module } from '@nestjs/common';
import { UcheckoutUserviceController } from './checkout-service.controller';
import { UcheckoutUserviceService } from './checkout-service.service';

@Module({
  imports: [],
  controllers: [UcheckoutUserviceController],
  providers: [UcheckoutUserviceService],
})
export class UcheckoutUserviceModule {}

import { Module } from '@nestjs/common';
import { UbillingUserviceController } from './billing-service.controller';
import { UbillingUserviceService } from './billing-service.service';

@Module({
  imports: [],
  controllers: [UbillingUserviceController],
  providers: [UbillingUserviceService],
})
export class UbillingUserviceModule {}

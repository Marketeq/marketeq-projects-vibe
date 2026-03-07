import { Module } from '@nestjs/common';
import { UcontractsUserviceController } from './contracts-service.controller';
import { UcontractsUserviceService } from './contracts-service.service';

@Module({
  imports: [],
  controllers: [UcontractsUserviceController],
  providers: [UcontractsUserviceService],
})
export class UcontractsUserviceModule {}

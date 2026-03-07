import { Module } from '@nestjs/common';
import { UtransactionUserviceController } from './transaction-service.controller';
import { UtransactionUserviceService } from './transaction-service.service';

@Module({
  imports: [],
  controllers: [UtransactionUserviceController],
  providers: [UtransactionUserviceService],
})
export class UtransactionUserviceModule {}

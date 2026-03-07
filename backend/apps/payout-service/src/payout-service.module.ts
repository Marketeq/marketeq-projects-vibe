import { Module } from '@nestjs/common';
import { UpayoutUserviceController } from './payout-service.controller';
import { UpayoutUserviceService } from './payout-service.service';

@Module({
  imports: [],
  controllers: [UpayoutUserviceController],
  providers: [UpayoutUserviceService],
})
export class UpayoutUserviceModule {}

// apps/payout-service/src/fees/fees.module.ts
// PS-34 §3: International payout fee calculation module
import { Module } from '@nestjs/common';
import { PayoutFeeService } from './payout-fee.service';

@Module({
  providers: [PayoutFeeService],
  exports: [PayoutFeeService],
})
export class FeesModule {}

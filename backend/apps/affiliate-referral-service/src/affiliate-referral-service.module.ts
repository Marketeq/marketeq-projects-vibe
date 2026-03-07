import { Module } from '@nestjs/common';
import { UaffiliateUreferralUserviceController } from './affiliate-referral-service.controller';
import { UaffiliateUreferralUserviceService } from './affiliate-referral-service.service';

@Module({
  imports: [],
  controllers: [UaffiliateUreferralUserviceController],
  providers: [UaffiliateUreferralUserviceService],
})
export class UaffiliateUreferralUserviceModule {}

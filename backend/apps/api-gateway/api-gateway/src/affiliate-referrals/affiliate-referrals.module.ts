import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { AffiliateReferralController } from './affiliate-referrals.controller';

@Module({
  imports: [GatewayHttpModule], // Using GatewayHttpModule to make HTTP requests to the User Service
  controllers: [AffiliateReferralController],
})
export class AffiliateReferralModule {}

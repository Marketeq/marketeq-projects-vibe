import { Controller, Get } from '@nestjs/common';

@Controller('affiliate-referral')
export class AffiliateReferralController {
  @Get('dashboard')
  getDashboard() {
    return { message: 'Affiliate Referral Dashboard' };
  }
}

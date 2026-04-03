import { HttpService } from '@nestjs/axios';
import { Controller, Get } from '@nestjs/common';
import { servicesConfig } from '../services-config';

@Controller('affiliate-referral')
export class AffiliateReferralController {
  constructor(private readonly httpService: HttpService) {}

  @Get('/dashboard')
  async getAffiliateReferralDashboard() {
    const response = await this.httpService
      .get(
        `${servicesConfig.AFFILIATE_REFERRAL_SERVICE_URL}/affiliate-referral/dashboard`,
      )
      .toPromise();
    return response.data;
  }
}

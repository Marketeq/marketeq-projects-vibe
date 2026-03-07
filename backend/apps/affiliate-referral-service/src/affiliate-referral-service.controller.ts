import { Controller, Get } from '@nestjs/common';
import { UaffiliateUreferralUserviceService } from './affiliate-referral-service.service';

@Controller()
export class UaffiliateUreferralUserviceController {
  constructor(private readonly service: UaffiliateUreferralUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'affiliate-referral-service' };
  }
}

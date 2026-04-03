import { HttpService } from '@nestjs/axios';
import { Controller, Get } from '@nestjs/common';
import { servicesConfig } from '../services-config';

@Controller('billing')
export class BillingController {
  constructor(private readonly httpService: HttpService) {}

  @Get('/profile')
  async getProfile() {
    // This proxies the request to the User Service
    const response = await this.httpService
      .get(`${servicesConfig.BILLING_PAYMENTS_SERVICE_URL}/billing/profile`)
      .toPromise();
    return response.data;
  }
}

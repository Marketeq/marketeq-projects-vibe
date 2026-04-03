import { HttpService } from '@nestjs/axios';
import { Controller, Get } from '@nestjs/common';
import { servicesConfig } from '../services-config';

@Controller('client-rating')
export class ClientRatingController {
  constructor(private readonly httpService: HttpService) {}

  @Get('/profile')
  async getProfile() {
    // This proxies the request to the User Service
    // const response = await this.httpService.get('http://user-service:3001/user/profile').toPromise();
    const response = await this.httpService
      .get(
        `${servicesConfig.CLIENT_RATING_SERVICE_URL}/client-rating/dashboard`,
      )
      .toPromise();
    return response.data;
  }
}

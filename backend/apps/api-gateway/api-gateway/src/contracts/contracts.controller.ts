import { HttpService } from '@nestjs/axios';
import { Controller, Get } from '@nestjs/common';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly httpService: HttpService) {}

  @Get('/profile')
  async getProfile() {
    // This proxies the request to the User Service
    // const response = await this.httpService.get('http://user-service:3001/user/profile').toPromise();
    const response = await this.httpService
      .get(
        'https://marketeq-user-service-2a80768ec1b3.herokuapp.com/user/profile',
      )
      .toPromise();
    return response.data;
  }
}

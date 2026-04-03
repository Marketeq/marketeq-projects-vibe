import { HttpService } from '@nestjs/axios';
import { Controller, Get } from '@nestjs/common';
import { servicesConfig } from '../services-config';

@Controller('algolia-search')
export class AlgoliaSearchController {
  constructor(private readonly httpService: HttpService) {}

  @Get('/dashboard')
  async getAlgoliaSearchDashboard() {
    const response = await this.httpService
      .get(
        `${servicesConfig.ALGOLIA_SEARCH_SERVICE_URL}/algolia-search/dashboard`,
      )
      .toPromise();

    return response.data;
  }
}

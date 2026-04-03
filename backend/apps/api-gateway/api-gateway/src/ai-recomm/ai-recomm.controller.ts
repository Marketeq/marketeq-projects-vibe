import { HttpService } from '@nestjs/axios';
import { Controller, Get } from '@nestjs/common';
import { servicesConfig } from '../services-config';

@Controller('ai-recomm')
export class AiRecommController {
  constructor(private readonly httpService: HttpService) {}

  @Get('/dashboard')
  async getAiRecommDashboard() {
    const response = await this.httpService
      .get(`${servicesConfig.AI_RECOMM_SERVICE_URL}/ai-recomm/dashboard`)
      .toPromise();
    return response.data;
  }
}

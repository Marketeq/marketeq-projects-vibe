import { Controller, Get } from '@nestjs/common';
import { UalgoliaUserviceService } from './algolia-service.service';

@Controller()
export class UalgoliaUserviceController {
  constructor(private readonly service: UalgoliaUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'algolia-service' };
  }
}

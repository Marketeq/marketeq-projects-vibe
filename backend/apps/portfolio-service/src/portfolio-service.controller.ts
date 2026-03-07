import { Controller, Get } from '@nestjs/common';
import { UportfolioUserviceService } from './portfolio-service.service';

@Controller()
export class UportfolioUserviceController {
  constructor(private readonly service: UportfolioUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'portfolio-service' };
  }
}

import { Controller, Get } from '@nestjs/common';
import { UearningsUserviceService } from './earnings-service.service';

@Controller()
export class UearningsUserviceController {
  constructor(private readonly service: UearningsUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'earnings-service' };
  }
}

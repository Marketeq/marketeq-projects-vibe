import { Controller, Get } from '@nestjs/common';
import { UadminUserviceService } from './admin-service.service';

@Controller()
export class UadminUserviceController {
  constructor(private readonly service: UadminUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'admin-service' };
  }
}

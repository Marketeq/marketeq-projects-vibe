import { Controller, Get } from '@nestjs/common';
import { UnotificationUserviceService } from './notification-service.service';

@Controller()
export class UnotificationUserviceController {
  constructor(private readonly service: UnotificationUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'notification-service' };
  }
}

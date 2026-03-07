import { Controller, Get } from '@nestjs/common';
import { UmessagingUserviceService } from './messaging-service.service';

@Controller()
export class UmessagingUserviceController {
  constructor(private readonly service: UmessagingUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'messaging-service' };
  }
}

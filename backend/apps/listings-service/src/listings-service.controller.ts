import { Controller, Get } from '@nestjs/common';
import { UlistingsUserviceService } from './listings-service.service';

@Controller()
export class UlistingsUserviceController {
  constructor(private readonly service: UlistingsUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'listings-service' };
  }
}

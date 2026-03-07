import { Controller, Get } from '@nestjs/common';
import { UauthUserviceService } from './auth-service.service';

@Controller()
export class UauthUserviceController {
  constructor(private readonly service: UauthUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'auth-service' };
  }
}

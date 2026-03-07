import { Controller, Get } from '@nestjs/common';
import { UuserUserviceService } from './user-service.service';

@Controller()
export class UuserUserviceController {
  constructor(private readonly service: UuserUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'user-service' };
  }
}

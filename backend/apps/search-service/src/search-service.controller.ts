import { Controller, Get } from '@nestjs/common';
import { UsearchUserviceService } from './search-service.service';

@Controller()
export class UsearchUserviceController {
  constructor(private readonly service: UsearchUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'search-service' };
  }
}

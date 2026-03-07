import { Controller, Get } from '@nestjs/common';
import { UcontractsUserviceService } from './contracts-service.service';

@Controller()
export class UcontractsUserviceController {
  constructor(private readonly service: UcontractsUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'contracts-service' };
  }
}

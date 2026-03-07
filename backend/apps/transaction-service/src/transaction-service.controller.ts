import { Controller, Get } from '@nestjs/common';
import { UtransactionUserviceService } from './transaction-service.service';

@Controller()
export class UtransactionUserviceController {
  constructor(private readonly service: UtransactionUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'transaction-service' };
  }
}

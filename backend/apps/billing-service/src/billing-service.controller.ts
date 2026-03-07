import { Controller, Get } from '@nestjs/common';
import { UbillingUserviceService } from './billing-service.service';

@Controller()
export class UbillingUserviceController {
  constructor(private readonly service: UbillingUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'billing-service' };
  }
}

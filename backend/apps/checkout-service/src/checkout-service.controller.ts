import { Controller, Get } from '@nestjs/common';
import { UcheckoutUserviceService } from './checkout-service.service';

@Controller()
export class UcheckoutUserviceController {
  constructor(private readonly service: UcheckoutUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'checkout-service' };
  }
}

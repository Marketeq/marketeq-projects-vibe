import { Controller, Get } from '@nestjs/common';
import { UpayoutUserviceService } from './payout-service.service';

@Controller()
export class UpayoutUserviceController {
  constructor(private readonly service: UpayoutUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'payout-service' };
  }
}

import { Controller, Get } from '@nestjs/common';
import { UtimeUtrackingUserviceService } from './time-tracking-service.service';

@Controller()
export class UtimeUtrackingUserviceController {
  constructor(private readonly service: UtimeUtrackingUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'time-tracking-service' };
  }
}

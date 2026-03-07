import { Controller, Get } from '@nestjs/common';
import { UcontentUmoderationUserviceService } from './content-moderation-service.service';

@Controller()
export class UcontentUmoderationUserviceController {
  constructor(private readonly service: UcontentUmoderationUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'content-moderation-service' };
  }
}

import { Controller, Get } from '@nestjs/common';
import { UapiUgatewayService } from './api-gateway.service';

@Controller()
export class UapiUgatewayController {
  constructor(private readonly service: UapiUgatewayService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'api-gateway' };
  }
}

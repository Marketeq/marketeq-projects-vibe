import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  private readonly startTime = Date.now();

  @Get('health')
  liveness() {
    return {
      status: 'ok',
      service: 'wire-review-service',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}

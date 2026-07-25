import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  ready() {
    const heapUsed = process.memoryUsage().heapUsed;
    const heapLimit = 400 * 1024 * 1024; // 400MB
    if (heapUsed > heapLimit) {
      return {
        status: 'not_ready',
        heapUsedMB: Math.round(heapUsed / 1024 / 1024),
      };
    }
    return {
      status: 'ok',
      heapUsedMB: Math.round(heapUsed / 1024 / 1024),
    };
  }
}

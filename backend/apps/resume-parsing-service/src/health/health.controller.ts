import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  // api-gateway's /services/health probe hits `${url}/health` on every
  // service (proxy.controller.ts). Without this route that probe 404s, which
  // the aggregator counts as "the process answered" rather than "the service
  // is healthy" — and every probe was logged as an unhandled exception.
  // auth-service defines the same bare route.
  @Get()
  health() {
    return { status: 'ok', service: 'resume-parsing-service' };
  }

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

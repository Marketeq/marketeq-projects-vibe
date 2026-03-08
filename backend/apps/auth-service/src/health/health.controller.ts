import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

@Controller('health')
export class HealthController {
  @ApiOperation({ summary: 'Get service health' })
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    };
  }
}

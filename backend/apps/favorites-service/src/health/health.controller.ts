import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';

@Controller('health')
export class HealthController {
  @ApiOperation({ summary: 'Get service health' })
  @Public()
  @Get()
  status() {
    return {
      status: 'ok',
      service: 'favorites-service',
      timestamp: new Date().toISOString(),
    };
  }
}

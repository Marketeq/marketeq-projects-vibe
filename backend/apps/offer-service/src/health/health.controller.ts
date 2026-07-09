// apps/offer-service/src/health/health.controller.ts
// OS-35: K8s liveness (/health) and readiness (/ready) probes.
// OS-36: Added @Public() so health endpoints skip JWT validation.
import {
  Controller, Get, HttpCode, HttpStatus, HttpException,
} from '@nestjs/common';
import { HealthService, ReadinessStatus } from './health.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @Public()
  @HttpCode(HttpStatus.OK)
  health(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @Public()
  async ready(): Promise<ReadinessStatus> {
    const result = await this.healthService.getReadinessStatus();
    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
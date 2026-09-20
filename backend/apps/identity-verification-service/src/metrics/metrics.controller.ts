import { Controller, Get, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { InternalServiceGuard } from '../common/guards/internal-service.guard';

@Controller('internal/metrics')
@UseGuards(InternalServiceGuard)
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  getMetrics(): Record<string, number> {
    return this.metricsService.getMetrics();
  }
}

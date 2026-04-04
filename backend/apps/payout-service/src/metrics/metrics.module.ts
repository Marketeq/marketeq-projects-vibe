// apps/payout-service/src/metrics/metrics.module.ts
// PS-00 §6: Observability — full implementation in PS-28
import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Module({
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
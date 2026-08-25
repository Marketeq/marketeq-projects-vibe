import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

import { HealthController } from '../controllers/health.controller';
import { MetricsService }   from '../services/metrics.service';
import { SchedulerService } from '../services/scheduler.service';
import { Invoice }          from '../entities/invoice.entity';
import { REDIS_CLIENT }     from '../constants';

export { REDIS_CLIENT };

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice]),
  ],
  controllers: [HealthController],
  providers: [
    MetricsService,
    SchedulerService,
    {
      provide:    REDIS_CLIENT,
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        if (!url) {
          console.warn('[transaction-service] REDIS_URL not set — Redis disabled');
          return null;
        }
        return new Redis(url, { lazyConnect: true, enableReadyCheck: false });
      },
    },
  ],
  exports: [MetricsService, REDIS_CLIENT],
})
export class HealthModule {}
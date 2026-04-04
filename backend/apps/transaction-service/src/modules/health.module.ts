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
      useFactory: (config: ConfigService) =>
        new Redis(config.get<string>('REDIS_URL') as string),
    },
  ],
  exports: [MetricsService, REDIS_CLIENT],
})
export class HealthModule {}
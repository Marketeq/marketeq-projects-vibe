import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule }          from '@nestjs/config';
import { HttpModule }            from '@nestjs/axios';
import { InternalController }    from './internal.controller';
import { InternalSyncController } from './internal-sync.controller';
import { InternalSyncService }   from './internal-sync.service';
import { buildRateLimitMiddleware } from './rate-limit.middleware';
import { BalanceModule }         from '../balance/balance.module';
import { EarningsModule }        from '../earnings/earnings.module';
@Module({
  imports:     [ConfigModule, HttpModule, BalanceModule, EarningsModule],
  controllers: [InternalController, InternalSyncController],
  providers:   [InternalSyncService],
  exports:     [InternalSyncService],
})
export class InternalModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(buildRateLimitMiddleware('balance', 120))
      .forRoutes({ path: 'internal/earnings/balance/*', method: RequestMethod.GET });
    consumer
      .apply(buildRateLimitMiddleware('ytd', 60))
      .forRoutes({ path: 'internal/earnings/ytd/*', method: RequestMethod.GET });
  }
}

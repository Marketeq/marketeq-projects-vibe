import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule }          from '@nestjs/config';
import { InternalController }    from './internal.controller';
import { buildRateLimitMiddleware } from './rate-limit.middleware';
import { BalanceModule }         from '../balance/balance.module';
import { EarningsModule }        from '../earnings/earnings.module';

@Module({
  imports:     [ConfigModule, BalanceModule, EarningsModule],
  controllers: [InternalController],
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

import { Module }           from '@nestjs/common';
import { ConfigModule }     from '@nestjs/config';
import earningsConfig       from './config/earnings.config';
import { DatabaseModule }   from './database/database.module';
import { CacheModule }      from './cache/cache.module';
import { CurrencyModule }   from './currency/currency.module';
import { GeoModule }        from './geo/geo.module';
import { BalanceModule }    from './balance/balance.module';
import { EarningsModule }   from './earnings/earnings.module';
import { InternalModule }   from './internal/internal.module';
import { ConsumersModule }  from './consumers/consumers.module';
import { PublishersModule } from './publishers/publishers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [earningsConfig] }),
    DatabaseModule,
    CacheModule,
    CurrencyModule,
    GeoModule,
    BalanceModule,
    EarningsModule,
    InternalModule,
    ConsumersModule,
    PublishersModule,
  ],
})
export class AppModule {}

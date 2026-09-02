import { Module }            from '@nestjs/common';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { BalanceController } from './balance.controller';
import { BalanceService }    from './balance.service';
import { BalanceSnapshot }   from '../entities/balance-snapshot.entity';
import { CacheModule }       from '../cache/cache.module';
import { CurrencyModule }    from '../currency/currency.module';
import { GeoModule }         from '../geo/geo.module';
import { PublishersModule }  from '../publishers/publishers.module';

@Module({
  imports:     [TypeOrmModule.forFeature([BalanceSnapshot]), CacheModule, CurrencyModule, GeoModule, PublishersModule],
  controllers: [BalanceController],
  providers:   [BalanceService],
  exports:     [BalanceService],
})
export class BalanceModule {}

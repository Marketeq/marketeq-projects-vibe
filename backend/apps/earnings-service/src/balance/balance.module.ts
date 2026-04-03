import { Module }            from '@nestjs/common';
import { TypeOrmModule }     from '@nestjs/typeorm';
import { BalanceController } from './balance.controller';
import { BalanceService }    from './balance.service';
import { BalanceSnapshot }   from '../entities/balance-snapshot.entity';
import { CacheModule }       from '../cache/cache.module';
import { CurrencyModule }    from '../currency/currency.module';

@Module({
  imports:     [TypeOrmModule.forFeature([BalanceSnapshot]), CacheModule, CurrencyModule],
  controllers: [BalanceController],
  providers:   [BalanceService],
  exports:     [BalanceService],
})
export class BalanceModule {}

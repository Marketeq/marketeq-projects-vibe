import { Module }             from '@nestjs/common';
import { TypeOrmModule }      from '@nestjs/typeorm';
import { EarningsController } from './earnings.controller';
import { EarningsService }    from './earnings.service';
import { EarningsCache }      from '../entities/earnings-cache.entity';
import { ContractLabelCache } from '../entities/contract-label-cache.entity';
import { CurrencyModule }     from '../currency/currency.module';

@Module({
  imports:     [TypeOrmModule.forFeature([EarningsCache, ContractLabelCache]), CurrencyModule],
  controllers: [EarningsController],
  providers:   [EarningsService],
  exports:     [EarningsService],
})
export class EarningsModule {}

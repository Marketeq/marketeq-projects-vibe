import { Module }             from '@nestjs/common';
import { TypeOrmModule }      from '@nestjs/typeorm';
import { ConfigModule }       from '@nestjs/config';
import { ExportController }   from './export.controller';
import { ExportService }      from './export.service';
import { EarningsCache }      from '../entities/earnings-cache.entity';
import { ContractLabelCache } from '../entities/contract-label-cache.entity';
import { CurrencyModule }     from '../currency/currency.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EarningsCache, ContractLabelCache]),
    CurrencyModule,
  ],
  controllers: [ExportController],
  providers:   [ExportService],
})
export class ExportModule {}

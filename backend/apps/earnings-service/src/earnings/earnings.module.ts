import { Module }             from '@nestjs/common';
import { TypeOrmModule }      from '@nestjs/typeorm';
import { EarningsController } from './earnings.controller';
import { EarningsService }    from './earnings.service';
import { EarningsCache }      from '../entities/earnings-cache.entity';
import { ContractLabelCache } from '../entities/contract-label-cache.entity';
import { CurrencyModule }     from '../currency/currency.module';
import { GeoModule }          from '../geo/geo.module';
import { ExportController }   from '../export/export.controller';
import { ExportService }      from '../export/export.service';

@Module({
  imports:     [TypeOrmModule.forFeature([EarningsCache, ContractLabelCache]), CurrencyModule, GeoModule],
  controllers: [ExportController, EarningsController],
  providers:   [EarningsService, ExportService],
  exports:     [EarningsService],
})
export class EarningsModule {}

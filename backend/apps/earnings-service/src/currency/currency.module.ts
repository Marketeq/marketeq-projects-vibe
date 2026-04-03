import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { ConfigModule }    from '@nestjs/config';
import { CurrencyService } from './currency.service';
import { FxRateCache }     from '../entities/fx-rate-cache.entity';

@Module({
  imports:  [ConfigModule, TypeOrmModule.forFeature([FxRateCache])],
  providers:[CurrencyService],
  exports:  [CurrencyService],
})
export class CurrencyModule {}

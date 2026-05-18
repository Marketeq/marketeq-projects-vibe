import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CurrencyController } from './controllers/currency.controller';
import { CurrencyService } from './services/currency.service';
import { FxCacheService } from './services/fx-cache.service';
import { FxRefreshService } from './services/fx-refresh.service';
import { CurrencyRate } from './entities/currency-rate.entity';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([CurrencyRate]),
  ],
  controllers: [CurrencyController],
  providers: [
    CurrencyService,
    FxCacheService,
    FxRefreshService,
  ],
  exports: [CurrencyService],
})
export class CurrencyModule {}

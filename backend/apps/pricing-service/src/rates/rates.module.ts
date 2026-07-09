import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { RatesController } from './controllers/rates.controller';
import { RatesService } from './services/rates.service';
import { RatesRefreshService } from './services/rates-refresh.service';
import { PlatformRateAverage } from './entities/platform-rate-average.entity';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([PlatformRateAverage]),
  ],
  controllers: [RatesController],
  providers: [
    RatesService,
    RatesRefreshService,
  ],
  exports: [RatesService],
})
export class RatesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfferHistoryEvent } from './entities/offer-history-event.entity';
import { OfferHistoryService } from './offer-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([OfferHistoryEvent])],
  providers: [OfferHistoryService],
  exports: [OfferHistoryService],
})
export class OfferHistoryModule {}
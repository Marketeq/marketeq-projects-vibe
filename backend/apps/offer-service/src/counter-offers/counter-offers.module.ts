// apps/offer-service/src/counter-offers/counter-offers.module.ts
// OS-10: Register CounterOffersController + service + cross-module deps
// OS-25: Added OffersModule (for OffersService), OutboxModule (for OutboxService)
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CounterOffer } from './entities/counter-offer.entity';
import { Offer } from '../offers/entities/offer.entity';
import { CounterOffersController } from './counter-offers.controller';
import { CounterOffersService } from './counter-offers.service';
import { OfferPartyGuard } from '../guards/offer-party.guard';
import { IdempotencyInterceptor } from '../interceptors/idempotency.interceptor';
import { OffersModule } from '../offers/offers.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CounterOffer, Offer]),
    forwardRef(() => OffersModule),
    OutboxModule,
  ],
  controllers: [CounterOffersController],
  providers: [CounterOffersService, OfferPartyGuard, IdempotencyInterceptor],
  exports: [CounterOffersService, TypeOrmModule],
})
export class CounterOffersModule {}
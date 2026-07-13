// apps/offer-service/src/offers/offers.module.ts
// OS-10: Register OffersController + all providers
// OS-23: AblyService injected via @Global() RealtimeModule — no import needed
// OS-25: Added OutboxModule import for OutboxService, OfferActionGuard
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from './entities/offer.entity';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { RolesGuard } from '../guards/roles.guard';
import { OfferPartyGuard } from '../guards/offer-party.guard';
import { OfferActionGuard } from './guards/offer-action.guard';
import { IdempotencyInterceptor } from '../interceptors/idempotency.interceptor';
import { OutboxModule } from '../outbox/outbox.module';
import { OfferHistoryModule } from '../offer-history/offer-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Offer]),
    OutboxModule,
    OfferHistoryModule,
  ],
  controllers: [OffersController],
  providers: [
    OffersService,
    RolesGuard,
    OfferPartyGuard,
    OfferActionGuard,
    IdempotencyInterceptor,
  ],
  exports: [OffersService, TypeOrmModule],
})
export class OffersModule {}
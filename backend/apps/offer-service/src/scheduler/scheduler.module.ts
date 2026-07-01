// apps/offer-service/src/scheduler/scheduler.module.ts
// OS-26: Registers cron-based processors for offer expiry and warnings.
// Requires ScheduleModule.forRoot() in AppModule.
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpiryProcessor } from './expiry.processor';
import { WarningProcessor } from './warning.processor';
import { Offer } from '../offers/entities/offer.entity';
import { CounterOffer } from '../counter-offers/entities/counter-offer.entity';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Offer, CounterOffer]),
    OutboxModule,
  ],
  providers: [
    ExpiryProcessor,
    WarningProcessor,
  ],
})
export class SchedulerModule {}
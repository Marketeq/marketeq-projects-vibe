// apps/payout-service/src/consumers/consumers.module.ts
// PS-00 §6 + §8.2: RabbitMQ consumers (inbound events)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleTriggerConsumer } from './schedule-trigger.consumer';
import { IdentityEventsConsumer } from './identity-events.consumer';
import { DepositMethod } from '../entities/deposit-method.entity';
import { PublishersModule } from '../publishers/publishers.module';
import { ScheduleConfigModule } from '../schedule/schedule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DepositMethod]),
    PublishersModule,     // PayoutPublisher
    ScheduleConfigModule, // ScheduleService — resumes a pending schedule on gate clear
  ],
  providers: [ScheduleTriggerConsumer, IdentityEventsConsumer],
  exports: [ScheduleTriggerConsumer],
})
export class ConsumersModule {}

// apps/payout-service/src/consumers/consumers.module.ts
// PS-00 §6 + §8.2: RabbitMQ consumers (inbound events)
import { Module } from '@nestjs/common';
import { ScheduleTriggerConsumer } from './schedule-trigger.consumer';

@Module({
  providers: [ScheduleTriggerConsumer],
  exports: [ScheduleTriggerConsumer],
})
export class ConsumersModule {}
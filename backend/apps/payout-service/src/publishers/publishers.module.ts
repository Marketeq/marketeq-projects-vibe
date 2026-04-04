// apps/payout-service/src/publishers/publishers.module.ts
// PS-00 §6 + §8.1: RabbitMQ publishers (outbound events)
import { Module } from '@nestjs/common';
import { PayoutPublisher } from './payout.publisher';

@Module({
  providers: [PayoutPublisher],
  exports: [PayoutPublisher],
})
export class PublishersModule {}
// apps/payout-service/src/publishers/publishers.module.ts
// PS-00 §6 + §8.1: RabbitMQ publishers (outbound events)
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PayoutPublisher } from './payout.publisher';

@Module({
  imports: [
    // Targets earnings-service's own inbound queue directly — NestJS's RMQ
    // ClientProxy.emit() calls channel.sendToQueue(this.queue, ...), i.e.
    // it delivers straight into whatever queue name is configured here, not
    // a named exchange. This must match the queue earnings-service's
    // ConsumersModule actually listens on (earnings.events, see its
    // main.ts) — a topic-exchange publish (marketeq.events) does not reach
    // it, since that queue has no binding to that exchange.
    ClientsModule.registerAsync([
      {
        name: 'EARNINGS_RABBITMQ_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: 'earnings.events',
            // Must match earnings-service's own declaration of this queue
            // exactly (its main.ts) — RabbitMQ rejects a re-declare with
            // different arguments (406 PRECONDITION-FAILED) rather than
            // merging them.
            queueOptions: {
              durable: true,
              arguments: {
                'x-dead-letter-exchange': 'marketeq.dlx',
                'x-message-ttl': 86400000,
              },
            },
          },
        }),
      },
    ]),
  ],
  providers: [PayoutPublisher],
  exports: [PayoutPublisher],
})
export class PublishersModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { OutboxEvent } from './entities/outbox-event.entity';
import { OutboxWorker } from './outbox.worker';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([OutboxEvent]),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL')!],
            queue: 'legal_queue',
            exchange: 'marketeq.legal',
            exchangeType: 'topic',
            queueOptions: { durable: true },
            noAck: true,
          },
        }),
      },
    ]),
  ],
  providers: [OutboxWorker],
  exports: [TypeOrmModule],
})
export class OutboxModule {}

import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsService } from './events.service';
import { EarningsSyncService } from './earnings-sync.service';
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URI') ?? 'amqp://localhost:5672'],
            queue: 'time_tracking_events',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  providers: [EventsService, EarningsSyncService],
  exports: [EventsService, EarningsSyncService],
})
export class EventsModule {}

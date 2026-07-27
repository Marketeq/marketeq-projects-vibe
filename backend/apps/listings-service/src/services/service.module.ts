import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ServicesInternalController } from './services-internal.controller';
import { ServicesController } from './service.controller';
import { ServicesService } from './service.service';
import { Service } from './entities/service.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Service]),
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'ALGOLIA_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL', 'amqp://localhost:5672')],
            queue: 'algolia_queue',
            queueOptions: { durable: true },
            socketOptions: { heartbeatIntervalInSeconds: 60 },
          },
        }),
      },
    ]),
  ],
  controllers: [ServicesController, ServicesInternalController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}

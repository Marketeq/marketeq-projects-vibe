import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BlocksClient } from './blocks.client';
import { BlockEnforcementService } from './block-enforcement.service';
import { BlockAuditService } from './block-audit.service';

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
            urls: [
              config.get<string>('RABBITMQ_URI') ||
                config.get<string>('RABBITMQ_URL') ||
                'amqp://localhost:5672',
            ],
            queue: 'user_service_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  providers: [BlocksClient, BlockEnforcementService, BlockAuditService],
  exports: [BlockEnforcementService],
})
export class BlocksModule {}

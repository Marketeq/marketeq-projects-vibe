import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PRICING_RPC, RoleRateService } from './role-rate.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: PRICING_RPC,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              config.get<string>('RABBITMQ_URI') ||
                config.get<string>('RABBITMQ_URL') ||
                '',
            ],
            queue: 'pricing_service_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  providers: [RoleRateService],
  exports: [RoleRateService],
})
export class RoleRateModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Contract } from './entities/contract.entity';
import { ContractGroup } from './entities/contract-group.entity';
import { ContractAudit } from './entities/audit.entity';
import { ContractsService } from './services/contracts.service';
import { AuditLoggerService } from './services/audit-logger.service';
import { EventsService } from './services/events.service';
import { ContractsController } from './controllers/contracts.controller';
import { GroupsController } from './controllers/groups.controller';
import { WebhooksController } from './controllers/webhooks.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [Contract, ContractGroup, ContractAudit],
        synchronize: config.get('NODE_ENV') !== 'production',
        ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature([Contract, ContractGroup, ContractAudit]),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URI') || 'amqp://localhost:5672'],
            queue: 'contracts_events_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [ContractsController, GroupsController, WebhooksController],
  providers: [ContractsService, AuditLoggerService, EventsService],
})
export class ContractsServiceModule {}

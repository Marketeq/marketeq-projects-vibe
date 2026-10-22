import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Invitation } from './entities/invitation.entity';
import { InvitationsService } from './invitations/invitations.service';
import { InvitationsController } from './invitations/invitations.controller';
import { UserServiceClient } from './invitations/user-service.client';
import { HealthController } from './health/health.controller';
import { InvitationEventsService } from './invitations/invitation-events.service';
import { CompanyInvitationsController } from './invitations/company-invitations.controller';
import { CompanyContextGuard } from './guards/company-context.guard';
import {
  IdentityVerificationGateClient,
  IDENTITY_VERIFICATION_CLIENT,
  IDENTITY_VERIFICATION_RPC_QUEUE,
  resolveBrokerUrl,
} from './invitations/identity-verification-gate.client';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/invitations-service/.env', '.env'],
    }),
    HttpModule,
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URI') || 'amqp://localhost:5672'],
            queue: 'notification_service_queue',
            queueOptions: { durable: true },
          },
        }),
      },
      {
        // Request/reply to identity-verification-service for the G7
        // verification gate. Own queue (its RPC queue, not the notification
        // queue above). Broker URL resolves RABBITMQ_URI then RABBITMQ_URL
        // (the frozen env templates only define RABBITMQ_URL). There is
        // deliberately NO localhost fallback: with neither set the client
        // has no broker, IdentityVerificationGateClient refuses before
        // sending, and every acceptance fails closed with 503.
        name: IDENTITY_VERIFICATION_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => {
          const url = resolveBrokerUrl(config);
          return {
            transport: Transport.RMQ,
            options: {
              urls: url ? [url] : [],
              queue: IDENTITY_VERIFICATION_RPC_QUEUE,
              queueOptions: { durable: true },
            },
          };
        },
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const useSSL = String(config.get('DATABASE_SSL_ENABLED') ?? 'false').toLowerCase() === 'true'
        return {
          type: 'postgres',
          url: config.get<string>('DATABASE_URL'),
          entities: [Invitation],
          synchronize: false,
          migrationsRun: true,
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          ssl: useSSL ? { rejectUnauthorized: false } : false,
        }
      },
    }),
    TypeOrmModule.forFeature([Invitation]),
  ],
  controllers: [InvitationsController, CompanyInvitationsController, HealthController],
  providers: [
    InvitationsService,
    UserServiceClient,
    InvitationEventsService,
    CompanyContextGuard,
    IdentityVerificationGateClient,
  ],
})
export class InvitationsServiceModule {}

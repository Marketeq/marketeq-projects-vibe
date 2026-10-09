// apps/time-tracking-service/src/identity-gate/identity-gate.module.ts
// Request/reply client to identity-verification-service for the G8 time-tracking gate
// (own RMQ client on the service's RPC queue).
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../sessions/session.entity';
import { TimeEntry } from '../entities/time-entry.entity';
import { BreakEvent } from '../entities/break-event.entity';
import {
  IDENTITY_VERIFICATION_CLIENT,
  IDENTITY_VERIFICATION_RPC_QUEUE,
  IdentityVerificationGateClient,
  resolveBrokerUrl,
} from './identity-verification-gate.client';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
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
    TypeOrmModule.forFeature([Session, TimeEntry, BreakEvent]),
  ],
  providers: [IdentityVerificationGateClient],
  exports: [IdentityVerificationGateClient, TypeOrmModule],
})
export class IdentityGateModule {}

// apps/offer-service/src/identity-gate/identity-gate.module.ts
// Request/reply client to identity-verification-service for the G4 offer gate,
// plus the guard that applies it. Own RMQ client on the service's RPC queue,
// separate from the outbox publisher (which is fire-and-forget to the
// marketeq.offers exchange).
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  IDENTITY_VERIFICATION_CLIENT,
  IDENTITY_VERIFICATION_RPC_QUEUE,
  IdentityVerificationGateClient,
  resolveBrokerUrl,
} from './identity-verification-gate.client';
import { TalentGateGuard } from '../guards/talent-gate.guard';

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
  ],
  providers: [IdentityVerificationGateClient, TalentGateGuard],
  exports: [IdentityVerificationGateClient, TalentGateGuard],
})
export class IdentityGateModule {}

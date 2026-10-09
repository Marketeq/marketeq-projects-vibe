// apps/listings-service/src/identity-gate/identity-gate.module.ts
// Request/reply client to identity-verification-service for the G2 publish gate
// (own RMQ client on the service's RPC queue, separate from the fire-and-forget
// Algolia/CMS publishers).
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
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
  ],
  providers: [IdentityVerificationGateClient],
  exports: [IdentityVerificationGateClient],
})
export class IdentityGateModule {}

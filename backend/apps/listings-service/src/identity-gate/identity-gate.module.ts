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
import { RosterGateService } from './roster-gate.service';
import { AccountGateStateService } from './account-gate-state.service';
import { GateStateConsumer } from './gate-state.consumer';
import { AccountGateReconciler, ALGOLIA_GATE_CLIENT } from './account-gate-reconciler';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        // G5: the listing-owner gate backfill to the search index (algolia-service).
        name: ALGOLIA_GATE_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => {
          const url = resolveBrokerUrl(config);
          return {
            transport: Transport.RMQ,
            options: { urls: url ? [url] : [], queue: 'algolia_service_queue', queueOptions: { durable: true } },
          };
        },
      },
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
  controllers: [GateStateConsumer],
  providers: [IdentityVerificationGateClient, AccountGateStateService, RosterGateService, AccountGateReconciler],
  exports: [IdentityVerificationGateClient, AccountGateStateService, RosterGateService],
})
export class IdentityGateModule {}

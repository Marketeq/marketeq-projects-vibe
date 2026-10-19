// Request/reply client to identity-verification-service for the G1 marketplace
// discovery gate (own RMQ client on the service's RPC queue).
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  IDENTITY_VERIFICATION_CLIENT,
  IDENTITY_VERIFICATION_RPC_QUEUE,
  IdentityVerificationGateClient,
  resolveBrokerUrl,
} from './identity-verification-gate.client';
import { TalentDiscoveryGateService } from './talent-discovery-gate.service';
import { MemberAddGate } from './member-add-gate';
import { TalentGateStateService } from './talent-gate-state.service';
import { TalentGateStateConsumer } from './talent-gate-state.consumer';

@Module({
  imports: [
    ConfigModule,
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
  controllers: [TalentGateStateConsumer],
  providers: [IdentityVerificationGateClient, TalentDiscoveryGateService, MemberAddGate, TalentGateStateService],
  exports: [IdentityVerificationGateClient, TalentDiscoveryGateService, MemberAddGate, TalentGateStateService],
})
export class IdentityGateModule {}

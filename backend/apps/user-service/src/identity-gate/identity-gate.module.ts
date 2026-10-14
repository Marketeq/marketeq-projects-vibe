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
  providers: [IdentityVerificationGateClient, TalentDiscoveryGateService, MemberAddGate],
  exports: [IdentityVerificationGateClient, TalentDiscoveryGateService, MemberAddGate],
})
export class IdentityGateModule {}

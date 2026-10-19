// apps/payout-service/src/identity-gate/identity-gate.module.ts
// Request/reply client to identity-verification-service for the G9 withdrawal
// gate (own RMQ client on the service's RPC queue; independent of the
// golevelup RabbitMQ connection the rest of payout-service uses).
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  IDENTITY_VERIFICATION_CLIENT,
  IDENTITY_VERIFICATION_RPC_QUEUE,
  IdentityVerificationGateClient,
  resolveBrokerUrl,
} from './identity-verification-gate.client';
import { PayoutWithdrawalGateGuard } from './payout-withdrawal-gate.guard';
import { PayoutExecutionGate } from './payout-execution-gate.service';
import { PayoutRequest } from '../entities/payout-request.entity';
import { PublishersModule } from '../publishers/publishers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayoutRequest]),
    PublishersModule, // PayoutPublisher: payout.failed releases a reservation
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
  providers: [IdentityVerificationGateClient, PayoutWithdrawalGateGuard, PayoutExecutionGate],
  exports: [IdentityVerificationGateClient, PayoutWithdrawalGateGuard, PayoutExecutionGate],
})
export class IdentityGateModule {}

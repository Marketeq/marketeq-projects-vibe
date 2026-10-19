import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PayoutModule } from '../payout/payout.module';
import { BankModule } from '../bank/bank.module';
import { CardModule } from '../card/card.module';
import { ExecutionModule } from '../execution/execution.module';
import { MagicLinkModule } from '../magic-link/magic-link.module';
import { ScheduleConfigModule } from '../schedule/schedule.module';
import { ConsumersModule } from '../consumers/consumers.module';
import { PayoutRequest } from '../entities/payout-request.entity';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';
import { IdentityGateModule } from './identity-gate.module';
import { IdentityVerificationGateClient } from './identity-verification-gate.client';
import { PayoutWithdrawalGateGuard } from './payout-withdrawal-gate.guard';
import { PayoutExecutionGate } from './payout-execution-gate.service';

describe('IdentityGateModule wiring (G9)', () => {
  it('exports the client, the request guard and the execution gate', () => {
    const exported = Reflect.getMetadata('exports', IdentityGateModule);
    expect(exported).toEqual(
      expect.arrayContaining([IdentityVerificationGateClient, PayoutWithdrawalGateGuard, PayoutExecutionGate]),
    );
  });

  it('resolves the real client, guard and execution gate through Nest DI', async () => {
    // The module's own providers, with the database/broker-backed dependencies stubbed.
    const { ClientsModule, Transport } = await import('@nestjs/microservices');
    const { IDENTITY_VERIFICATION_CLIENT, IDENTITY_VERIFICATION_RPC_QUEUE } = await import('./identity-verification-gate.client');
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ RABBITMQ_URL: 'amqp://test-broker' })] }),
        ClientsModule.register([
          { name: IDENTITY_VERIFICATION_CLIENT, transport: Transport.RMQ, options: { urls: [], queue: IDENTITY_VERIFICATION_RPC_QUEUE } },
        ]),
      ],
      providers: [
        IdentityVerificationGateClient,
        PayoutWithdrawalGateGuard,
        PayoutExecutionGate,
        { provide: getRepositoryToken(PayoutRequest), useValue: {} },
        { provide: AuditService, useValue: {} },
        { provide: PayoutPublisher, useValue: {} },
      ],
    }).compile();
    expect(moduleRef.get(PayoutExecutionGate)).toBeInstanceOf(PayoutExecutionGate);
    expect(moduleRef.get(PayoutWithdrawalGateGuard)).toBeInstanceOf(PayoutWithdrawalGateGuard);
    await moduleRef.close();
  });

  it('is imported by every module that hosts a money-moving step', () => {
    for (const host of [PayoutModule, BankModule, CardModule, ExecutionModule, MagicLinkModule, ScheduleConfigModule, ConsumersModule]) {
      expect(Reflect.getMetadata('imports', host)).toContain(IdentityGateModule);
    }
  });
});

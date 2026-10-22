import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { IdentityGateModule } from './identity-gate.module';
import { IdentityVerificationGateClient } from './identity-verification-gate.client';
import { ServicesModule } from '../services/service.module';
import { AccountGateStateService } from './account-gate-state.service';
import { RosterGateService } from './roster-gate.service';
import { GateStateConsumer } from './gate-state.consumer';

// The app has one global TypeORM DataSource; tests give the module a stand-in.
@Global()
@Module({ providers: [{ provide: DataSource, useValue: { query: async () => [] } }], exports: [DataSource] })
class FakeDataSourceModule {}

describe('IdentityGateModule wiring (G2)', () => {
  it('resolves the real client through Nest DI', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ RABBITMQ_URL: 'amqp://test-broker' })] }),
        FakeDataSourceModule,
        IdentityGateModule,
      ],
    }).compile();
    expect(moduleRef.get(IdentityVerificationGateClient)).toBeInstanceOf(IdentityVerificationGateClient);
    // G5: the roster rule is backed by the local last-known state, and the durable
    // consumer that keeps it current is part of the same module.
    expect(moduleRef.get(AccountGateStateService)).toBeInstanceOf(AccountGateStateService);
    expect(moduleRef.get(RosterGateService)).toBeInstanceOf(RosterGateService);
    expect(Reflect.getMetadata('controllers', IdentityGateModule)).toContain(GateStateConsumer);
    await moduleRef.close();
  });

  it('is imported by the module that hosts the gated service routes', () => {
    expect(Reflect.getMetadata('imports', ServicesModule)).toContain(IdentityGateModule);
  });
});

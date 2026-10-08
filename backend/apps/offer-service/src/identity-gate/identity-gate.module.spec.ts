import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { IdentityGateModule } from './identity-gate.module';
import { IdentityVerificationGateClient } from './identity-verification-gate.client';
import { TalentGateGuard } from '../guards/talent-gate.guard';
import { OffersModule } from '../offers/offers.module';
import { CounterOffersModule } from '../counter-offers/counter-offers.module';

describe('IdentityGateModule wiring', () => {
  it('resolves the real client and guard through Nest DI (no hand-built providers)', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ RABBITMQ_URL: 'amqp://test-broker' })] }), IdentityGateModule],
    }).compile();

    expect(moduleRef.get(IdentityVerificationGateClient)).toBeInstanceOf(IdentityVerificationGateClient);
    expect(moduleRef.get(TalentGateGuard)).toBeInstanceOf(TalentGateGuard);
    await moduleRef.close();
  });

  it('is imported by both modules that host a gated controller', () => {
    expect(Reflect.getMetadata('imports', OffersModule)).toContain(IdentityGateModule);
    expect(Reflect.getMetadata('imports', CounterOffersModule)).toContain(IdentityGateModule);
  });
});

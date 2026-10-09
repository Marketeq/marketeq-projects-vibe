import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { IdentityGateModule } from './identity-gate.module';
import { IdentityVerificationGateClient } from './identity-verification-gate.client';
import { ServicesModule } from '../services/service.module';

describe('IdentityGateModule wiring (G2)', () => {
  it('resolves the real client through Nest DI', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ RABBITMQ_URL: 'amqp://test-broker' })] }),
        IdentityGateModule,
      ],
    }).compile();
    expect(moduleRef.get(IdentityVerificationGateClient)).toBeInstanceOf(IdentityVerificationGateClient);
    await moduleRef.close();
  });

  it('is imported by the module that hosts the gated service routes', () => {
    expect(Reflect.getMetadata('imports', ServicesModule)).toContain(IdentityGateModule);
  });
});

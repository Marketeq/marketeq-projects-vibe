import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Session } from '../sessions/session.entity';
import { TimeEntry } from '../entities/time-entry.entity';
import { BreakEvent } from '../entities/break-event.entity';
import { IdentityGateModule } from './identity-gate.module';
import { IdentityVerificationGateClient } from './identity-verification-gate.client';
import { SessionsModule } from '../sessions/sessions.module';
import { TimeEntriesModule } from '../time-entries/time-entries.module';
import { BreaksModule } from '../breaks/breaks.module';
import { IdlesModule } from '../idles/idles.module';
import { ManualTimeModule } from '../manual-time/manual-time.module';
import { DownloadsModule } from '../downloads/downloads.module';

describe('IdentityGateModule wiring (G8)', () => {
  it('resolves the real client through Nest DI', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ RABBITMQ_URL: 'amqp://test-broker' })] }),
        IdentityGateModule,
      ],
    })
      .overrideProvider(getRepositoryToken(Session))
      .useValue({})
      .overrideProvider(getRepositoryToken(TimeEntry))
      .useValue({})
      .overrideProvider(getRepositoryToken(BreakEvent))
      .useValue({})
      .compile();
    expect(moduleRef.get(IdentityVerificationGateClient)).toBeInstanceOf(IdentityVerificationGateClient);
    await moduleRef.close();
  });

  it.each([
    ['SessionsModule', SessionsModule],
    ['TimeEntriesModule', TimeEntriesModule],
    ['BreaksModule', BreaksModule],
    ['IdlesModule', IdlesModule],
    ['ManualTimeModule', ManualTimeModule],
    ['DownloadsModule', DownloadsModule],
  ])('is imported by %s, which hosts gated routes', (_name, mod) => {
    expect(Reflect.getMetadata('imports', mod)).toContain(IdentityGateModule);
  });
});

import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import { of, throwError } from 'rxjs';
import * as request from 'supertest';
import { DownloadsController } from './downloads.controller';
import { Session } from '../sessions/session.entity';
import { TimeEntry } from '../entities/time-entry.entity';
import { BreakEvent } from '../entities/break-event.entity';
import {
  AccountGateDecision,
  IDENTITY_VERIFICATION_CLIENT,
  IdentityVerificationGateClient,
} from '../identity-gate/identity-verification-gate.client';

// G8: the gate check the frontend calls before it starts a Time Tracker
// download. It authenticates, runs the identity gate and answers allowed or
// not; it never returns an installer URL (the public release URL is unchanged
// and direct access to it is out of scope).

const TALENT = '11111111-1111-4111-8111-111111111111';
const JWT_SECRET = 'jwt-secret';
const auth = (id = TALENT) => ({ Authorization: `Bearer ${jwt.sign({ sub: id }, JWT_SECRET)}` });

describe('G8 - Time Tracker installer download', () => {
  let app: INestApplication;

  async function build(gateProvider: any, proxy?: any) {
    process.env.JWT_SECRET = JWT_SECRET;
    delete process.env.AUTH_JWT_PUBLIC_KEY;
    const providers: any[] = [
      { provide: getRepositoryToken(Session), useValue: { findOneBy: jest.fn() } },
      { provide: getRepositoryToken(TimeEntry), useValue: { findOneBy: jest.fn() } },
      { provide: getRepositoryToken(BreakEvent), useValue: { findOneBy: jest.fn() } },
      { provide: ConfigService, useValue: { get: (k: string) => (k === 'RABBITMQ_URL' ? 'amqp://test' : undefined) } },
    ];
    if (gateProvider === 'real') {
      providers.push(IdentityVerificationGateClient, { provide: IDENTITY_VERIFICATION_CLIENT, useValue: proxy });
    } else {
      providers.push({ provide: IdentityVerificationGateClient, useValue: gateProvider });
    }
    const moduleRef = await Test.createTestingModule({ controllers: [DownloadsController], providers }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }

  afterEach(async () => {
    await app?.close();
  });

  const get = (headers: Record<string, string> = auth()) =>
    request(app.getHttpServer()).get('/downloads/time-tracker/check').set(headers);

  describe('stubbed gate decision', () => {
    let gate: jest.Mock<Promise<AccountGateDecision>, [string]>;
    beforeEach(async () => {
      gate = jest.fn(async () => ({ gateOpen: true, missingRequirements: 'none' }));
      await build({ checkGate: gate });
    });

    it('verified or in-grace talent (gate open) is allowed, with no installer URL in the answer', async () => {
      const res = await get();
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ allowed: true });
      expect(res.headers['cache-control']).toBe('no-store');
      expect(gate).toHaveBeenCalledWith(TALENT);
    });

    it.each(['identity', 'location', 'both'] as const)('unverified talent (%s outstanding): 403 VERIFICATION_REQUIRED', async (m) => {
      gate.mockResolvedValue({ gateOpen: false, missingRequirements: m });
      const res = await get();
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ success: false, error: 'VERIFICATION_REQUIRED', message: 'Verify your account to continue.', missingRequirements: m });
    });

    it('identity verification unavailable: 503 IDENTITY_VERIFICATION_UNAVAILABLE', async () => {
      const { IdentityVerificationUnavailableException } = await import('../identity-gate/identity-gate.exceptions');
      gate.mockRejectedValue(new IdentityVerificationUnavailableException());
      const res = await get();
      expect(res.status).toBe(503);
      expect(res.body.error).toBe('IDENTITY_VERIFICATION_UNAVAILABLE');
    });

    it('unauthenticated: 401 before any gate call', async () => {
      const res = await get({});
      expect(res.status).toBe(401);
      expect(gate).not.toHaveBeenCalled();
    });
  });

  describe('real gate client over a stubbed RabbitMQ proxy', () => {
    it.each([
      ['empty object', {}],
      ['null', null],
      ['gateOpen as a string', { gateOpen: 'true', missingRequirements: 'none' }],
      ['missing missingRequirements', { gateOpen: true }],
      ['unknown requirement', { gateOpen: false, missingRequirements: 'banana' }],
      ['open but contradicting', { gateOpen: true, missingRequirements: 'identity' }],
      ['closed but naming nothing', { gateOpen: false, missingRequirements: 'none' }],
    ])('malformed reply (%s): 503, never allowed', async (_l, reply) => {
      await build('real', { send: jest.fn(() => of(reply)) });
      const res = await get();
      expect(res.status).toBe(503);
      expect(res.body.error).toBe('IDENTITY_VERIFICATION_UNAVAILABLE');
    });

    it('a transport error: 503, never allowed', async () => {
      await build('real', { send: jest.fn(() => throwError(() => new Error('no consumers'))) });
      expect((await get()).status).toBe(503);
    });

    it('well-formed open reply is allowed; well-formed closed reply is refused', async () => {
      await build('real', { send: jest.fn(() => of({ gateOpen: true, missingRequirements: 'none' })) });
      expect((await get()).status).toBe(200);
      await app.close();
      await build('real', { send: jest.fn(() => of({ gateOpen: false, missingRequirements: 'both' })) });
      const res = await get();
      expect(res.status).toBe(403);
      expect(res.body.missingRequirements).toBe('both');
    });
  });
});

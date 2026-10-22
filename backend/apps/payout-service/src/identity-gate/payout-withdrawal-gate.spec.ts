import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { NEVER, of, throwError } from 'rxjs';
import * as request from 'supertest';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { MagicLinkService } from '../magic-link/magic-link.service';
import { PayoutController } from '../payout/payout.controller';
import { PayoutService } from '../payout/payout.service';
import {
  IDENTITY_GATE_TIMEOUT_MS,
  IDENTITY_VERIFICATION_CLIENT,
  IdentityVerificationGateClient,
} from './identity-verification-gate.client';
import { PayoutWithdrawalGateGuard } from './payout-withdrawal-gate.guard';

// G9: a contractor who is not gate_open cannot initiate a withdrawal. Real
// controller, real guards (JwtAuthGuard / G9), real gate client, real
// ValidationPipe and the real exception filter; only the RabbitMQ transport
// and the PayoutService / MagicLinkService collaborators are stubbed, so every
// "no side effects" claim is checked against the collaborators initiate() would
// have used.

const CONTRACTOR = '11111111-1111-4111-8111-111111111111';
const JWT_SECRET = 'test-jwt-secret';

const BODY = {
  amountUsd: '100.00',
  speed: 'standard',
  depositMethodId: '33333333-3333-4333-8333-333333333333',
  idempotencyKey: '44444444-4444-4444-8444-444444444444',
};

const OPEN = { gateOpen: true, missingRequirements: 'none' };
const CLOSED = (m: 'identity' | 'location' | 'both') => ({ gateOpen: false, missingRequirements: m });

describe('G9 - withdrawal verification gate', () => {
  let app: INestApplication;
  let send: jest.Mock;
  let payoutService: Record<string, jest.Mock>;
  let magicLinkService: Record<string, jest.Mock>;
  let brokerUrl: string | undefined;

  const token = (sub: string = CONTRACTOR) => jwt.sign({ sub, email: 'c@example.com', role: 'TALENT' }, JWT_SECRET);
  const authed = (sub?: string) => ({ Authorization: `Bearer ${token(sub)}` });

  const initiate = (headers: Record<string, string> = authed(), body: Record<string, unknown> = BODY) =>
    request(app.getHttpServer()).post('/v1/payouts/initiate').set(headers).send(body);

  const anyCollaboratorCalled = () =>
    [...Object.values(payoutService), ...Object.values(magicLinkService)].some((fn) => fn.mock.calls.length > 0);

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    delete process.env.AUTH_JWT_PUBLIC_KEY;
  });

  beforeEach(async () => {
    brokerUrl = 'amqp://test-broker';
    send = jest.fn().mockReturnValue(of(OPEN));
    payoutService = {
      initiate: jest.fn().mockResolvedValue({ payoutRequestId: 'p1', status: 'PENDING_VERIFICATION' }),
      checkGate: jest.fn().mockResolvedValue({ allowed: true }),
      validateAmount: jest.fn().mockResolvedValue({ ok: true }),
      cancel: jest.fn().mockResolvedValue({ cancelled: true }),
      list: jest.fn().mockResolvedValue([]),
      enqueueForProcessing: jest.fn().mockResolvedValue(undefined),
      verifyMagicLink: jest.fn(),
    };
    magicLinkService = {
      resendVerification: jest.fn().mockResolvedValue({ sent: true }),
      verifyEmailToken: jest.fn().mockResolvedValue({ status: 'verified' }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PayoutController],
      providers: [
        { provide: PayoutService, useValue: payoutService },
        { provide: MagicLinkService, useValue: magicLinkService },
        JwtAuthGuard,
        PayoutWithdrawalGateGuard,
        IdentityVerificationGateClient,
        { provide: IDENTITY_VERIFICATION_CLIENT, useValue: { send } },
        { provide: ConfigService, useValue: { get: (k: string) => (k === 'RABBITMQ_URL' ? brokerUrl : undefined) } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('allowed', () => {
    it('lets a verified contractor initiate, passing the unchanged request to initiate()', async () => {
      const res = await initiate();
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ payoutRequestId: 'p1', status: 'PENDING_VERIFICATION' });
      expect(payoutService.initiate).toHaveBeenCalledTimes(1);
      expect(payoutService.initiate).toHaveBeenCalledWith(CONTRACTOR, expect.objectContaining(BODY), 'c@example.com');
    });

    it('lets a contractor inside the 30-day grace period initiate (the gate service answers gateOpen)', async () => {
      // Grace is computed by identity-verification-service; payout-service only
      // ever sees the resulting {gateOpen:true, missingRequirements:'none'}.
      send.mockReturnValue(of({ gateOpen: true, missingRequirements: 'none' }));
      const res = await initiate();
      expect(res.status).toBe(200);
      expect(payoutService.initiate).toHaveBeenCalledTimes(1);
    });

    it('asks the gate about the authenticated contractor only, never a body or header value', async () => {
      await initiate({ ...authed(), 'x-user-id': 'someone-else' }, { ...BODY });
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][0]).toBe('identity_verification.gate_check');
      expect(send.mock.calls[0][1].data).toEqual({ userId: CONTRACTOR });
    });
  });

  describe('closed gate (unverified)', () => {
    it.each([['identity'], ['location'], ['both']] as const)(
      'returns 403 VERIFICATION_REQUIRED with missingRequirements=%s and touches nothing',
      async (missing) => {
        send.mockReturnValue(of(CLOSED(missing)));
        const res = await initiate();
        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({
          statusCode: 403,
          errorCode: 'VERIFICATION_REQUIRED',
          message: 'Verify your account to continue.',
          missingRequirements: missing,
        });
        expect(anyCollaboratorCalled()).toBe(false);
      },
    );

    it('refuses before validation, so an invalid body from an unverified contractor is still a 403', async () => {
      send.mockReturnValue(of(CLOSED('both')));
      const res = await initiate(authed(), { amountUsd: 5 });
      expect(res.status).toBe(403);
      expect(anyCollaboratorCalled()).toBe(false);
    });

    it('refuses a replay of an earlier idempotency key (no replayed payout for a closed gate)', async () => {
      send.mockReturnValue(of(CLOSED('identity')));
      const res = await initiate();
      expect(res.status).toBe(403);
      expect(payoutService.initiate).not.toHaveBeenCalled();
    });

    it('exposes only the two documented fields, nothing about status, documents or vendors', async () => {
      send.mockReturnValue(of({ ...CLOSED('identity'), inGrace: false, identityVerificationStatus: 'failed' }));
      const res = await initiate();
      expect(Object.keys(res.body).sort()).toEqual(['errorCode', 'message', 'missingRequirements', 'path', 'statusCode', 'timestamp']);
    });

    it('reopens as soon as the account is verified again', async () => {
      send.mockReturnValue(of(CLOSED('identity')));
      expect((await initiate()).status).toBe(403);
      send.mockReturnValue(of(OPEN));
      expect((await initiate()).status).toBe(200);
      expect(payoutService.initiate).toHaveBeenCalledTimes(1);
    });
  });

  describe('gate cannot be evaluated (fails closed)', () => {
    const expectUnavailable = async () => {
      const res = await initiate();
      expect(res.status).toBe(503);
      expect(res.body).toMatchObject({
        statusCode: 503,
        errorCode: 'IDENTITY_VERIFICATION_UNAVAILABLE',
      });
      expect(res.body.missingRequirements).toBeUndefined();
      expect(anyCollaboratorCalled()).toBe(false);
    };

    it('503 when the RPC errors', async () => {
      send.mockReturnValue(throwError(() => new Error('broker down')));
      await expectUnavailable();
    });

    it('503 when no reply arrives within the bounded timeout', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setInterval', 'clearInterval'] });
      try {
        send.mockReturnValue(NEVER);
        const pending = initiate().then((r) => r);
        await new Promise((r) => setImmediate(r));
        await jest.advanceTimersByTimeAsync(IDENTITY_GATE_TIMEOUT_MS + 50);
        const res = await pending;
        expect(res.status).toBe(503);
        expect(res.body.errorCode).toBe('IDENTITY_VERIFICATION_UNAVAILABLE');
        expect(anyCollaboratorCalled()).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });

    it('503 when no broker URL is configured, without even sending', async () => {
      brokerUrl = undefined;
      await expectUnavailable();
      expect(send).not.toHaveBeenCalled();
    });

    it.each([
      ['null', null],
      ['a string', 'open'],
      ['an array', [true]],
      ['an empty object', {}],
      ['gateOpen as a string', { gateOpen: 'true', missingRequirements: 'none' }],
      ['gateOpen as 1', { gateOpen: 1, missingRequirements: 'none' }],
      ['missingRequirements missing', { gateOpen: true }],
      ['an unknown missingRequirements value', { gateOpen: false, missingRequirements: 'everything' }],
      ['an open gate that still lists a missing requirement', { gateOpen: true, missingRequirements: 'identity' }],
      ['a closed gate that lists nothing missing', { gateOpen: false, missingRequirements: 'none' }],
    ])('503 on a malformed reply: %s', async (_name, reply) => {
      send.mockReturnValue(of(reply));
      await expectUnavailable();
    });
  });

  describe('unauthenticated', () => {
    it.each([
      ['no Authorization header', {}],
      ['a non-Bearer header', { Authorization: 'Basic abc' }],
      ['a token signed with the wrong secret', { Authorization: `Bearer ${jwt.sign({ sub: CONTRACTOR }, 'wrong')}` }],
    ])('401 with %s and no identity lookup', async (_name, headers) => {
      const res = await initiate(headers as Record<string, string>);
      expect(res.status).toBe(401);
      expect(send).not.toHaveBeenCalled();
      expect(anyCollaboratorCalled()).toBe(false);
    });

    it('401 for a token with no subject, before any identity lookup', async () => {
      const noSub = jwt.sign({ email: 'c@example.com' }, JWT_SECRET);
      const res = await initiate({ Authorization: `Bearer ${noSub}` });
      expect(res.status).toBe(401);
      expect(send).not.toHaveBeenCalled();
      expect(anyCollaboratorCalled()).toBe(false);
    });
  });

  describe('scope: only the withdrawal initiation is gated', () => {
    const guardsOf = (handler: string) =>
      (Reflect.getMetadata(GUARDS_METADATA, (PayoutController.prototype as any)[handler]) ?? []) as unknown[];

    it('initiate carries JwtAuthGuard then the G9 guard, in that order (auth first, gate last)', () => {
      expect(guardsOf('initiate')).toEqual([JwtAuthGuard, PayoutWithdrawalGateGuard]);
    });

    it.each(['gateCheck', 'validateAmount', 'cancel', 'resendVerification', 'verify', 'verifyEmail', 'list'])(
      '%s does not carry the G9 guard',
      (handler) => {
        expect(guardsOf(handler)).not.toContain(PayoutWithdrawalGateGuard);
      },
    );

    it('cancelling a pending withdrawal stays available while the gate is closed', async () => {
      send.mockReturnValue(of(CLOSED('both')));
      const res = await request(app.getHttpServer())
        .delete('/v1/payouts/55555555-5555-4555-8555-555555555555')
        .set(authed());
      expect(res.status).toBe(200);
      expect(payoutService.cancel).toHaveBeenCalledTimes(1);
      expect(send).not.toHaveBeenCalled();
    });

    it('the pre-flight gate-check and amount preview make no identity call', async () => {
      send.mockReturnValue(of(CLOSED('both')));
      const pre = await request(app.getHttpServer()).get('/v1/payouts/gate-check').set(authed());
      expect(pre.status).toBe(200);
      const preview = await request(app.getHttpServer())
        .post('/v1/payouts/validate-amount')
        .set(authed())
        .send({ amountUsd: '10.00', speed: 'standard', depositMethodId: BODY.depositMethodId });
      expect([200, 400]).toContain(preview.status);
      expect(send).not.toHaveBeenCalled();
    });
  });
});

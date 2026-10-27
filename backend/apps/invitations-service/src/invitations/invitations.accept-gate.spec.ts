import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Observable, of, throwError } from 'rxjs';
import * as request from 'supertest';
import { Invitation, InvitationStatus } from '../entities/invitation.entity';
import { InvitationExceptionFilter } from '../filters/invitation-exception.filter';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { InvitationEventsService } from './invitation-events.service';
import { UserServiceClient } from './user-service.client';
import { InviteSettingsService } from './invite-settings.service';
import { InviteAccessLevel } from '../entities/invite-settings.entity';
import {
  ACCOUNT_GATE_CHECK_PATTERN,
  IDENTITY_GATE_TIMEOUT_MS,
  IDENTITY_VERIFICATION_CLIENT,
  IdentityVerificationGateClient,
  resolveBrokerUrl,
} from './identity-verification-gate.client';
import { IdentityVerificationUnavailableException } from '../common/invitation-exceptions';

// backend/jest.config.js has no moduleNameMapper for the @libs/* tsconfig
// paths, so anything importing @libs/auth (here: decorators/public.decorator.ts,
// pulled in by GatewayAuthGuard) cannot be resolved under Jest. Mocked
// locally, and only for the two names this service re-exports, rather than
// changing the shared backend Jest config for every service.
jest.mock(
  '@libs/auth',
  () => {
    const { SetMetadata } = jest.requireActual('@nestjs/common');
    return {
      IS_PUBLIC_KEY: 'isPublic',
      Public: () => SetMetadata('isPublic', true),
    };
  },
  { virtual: true },
);

const ROUTES = ['/invitations/accept', '/v1/invitations/accept'] as const;
const INVITEE = { id: 'user-1', email: 'invitee@example.com' };

// The exact shapes identity-verification-service replies with
// (AccountGateDecision): only gateOpen and missingRequirements. Raw statuses
// and the grace flag never leave that service, so a grace-period account is
// deliberately indistinguishable from a verified one here.
const reply = (over: Record<string, unknown>) => ({
  gateOpen: false,
  missingRequirements: 'both',
  ...over,
});
const OPEN_VERIFIED = reply({ gateOpen: true, missingRequirements: 'none' });
const OPEN_IN_GRACE = OPEN_VERIFIED; // same wire shape by design
const CLOSED_BOTH = reply({});
const CLOSED_IDENTITY = reply({ missingRequirements: 'identity' });
const CLOSED_LOCATION = reply({ missingRequirements: 'location' });
// What identity-verification-service answers for an account with no profile.
const CLOSED_NO_PROFILE = reply({});

describe('invitation acceptance — account-verification gate (G7)', () => {
  let app: INestApplication;
  let identityClient: { send: jest.Mock };
  let repo: { findOne: jest.Mock; save: jest.Mock; update: jest.Mock; find: jest.Mock; create: jest.Mock };
  let userService: Record<string, jest.Mock>;
  let events: Record<string, jest.Mock>;
  let rabbit: { emit: jest.Mock };
  let inviteSettings: Record<string, jest.Mock>;

  const pendingInvitation = () =>
    ({
      id: 'inv-1',
      teamId: 'team-1',
      teamName: 'Acme',
      companyId: 'company-1',
      invitedEmail: INVITEE.email,
      role: 'viewer',
      permissions: ['read'],
      status: InvitationStatus.PENDING,
      token: 'legacy-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdByUserId: 'inviter-1',
      createdByEmail: 'inviter@example.com',
      note: null,
      acceptedAt: null,
      canceledAt: null,
      resentCount: 0,
    }) as unknown as Invitation;

  const gateReplies = (value: unknown) => identityClient.send.mockReturnValue(of(value));

  // verifyInviteLinkToken (the fallback for a token that matches no DB row)
  // throws without a signing secret; it is only reached by the
  // gate-open/bad-token case below.
  const ORIGINAL_SECRET = process.env.INVITE_TOKEN_SECRET;
  beforeAll(() => {
    process.env.INVITE_TOKEN_SECRET = 'test-only-invite-token-secret-32-chars-min';
  });
  afterAll(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.INVITE_TOKEN_SECRET;
    else process.env.INVITE_TOKEN_SECRET = ORIGINAL_SECRET;
  });

  beforeEach(async () => {
    identityClient = { send: jest.fn() };
    repo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(pendingInvitation())),
      save: jest.fn().mockImplementation((v: unknown) => Promise.resolve(v)),
      update: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
    };
    userService = {
      addTeamMember: jest.fn().mockResolvedValue(true),
      addCompanyMember: jest.fn().mockResolvedValue(true),
      getUserSummary: jest.fn().mockResolvedValue({ id: INVITEE.id, email: INVITEE.email, onboardingDismissed: true }),
      getUserSummaryByEmail: jest.fn().mockResolvedValue(null),
      getCompany: jest.fn().mockResolvedValue(null),
      getCompanyMemberCount: jest.fn().mockResolvedValue(1),
      dismissOnboarding: jest.fn().mockResolvedValue({
        id: INVITEE.id,
        email: INVITEE.email,
        role: 'member',
        onboardingDismissed: true,
        hasCompletedOnboarding: true,
        isActive: true,
      }),
      syncUserProfile: jest.fn().mockResolvedValue(undefined),
    };
    events = {
      accepted: jest.fn(),
      created: jest.fn(),
      resent: jest.fn(),
      revoked: jest.fn(),
    };
    rabbit = { emit: jest.fn() };
    // Invite settings are not what this suite is about: a stub on the
    // defaults keeps every link unrestricted and unexpired, so the gate is
    // still the only thing that can refuse anything here.
    inviteSettings = {
      get: jest.fn().mockResolvedValue({ accountId: 'team-1', notificationAlerts: true }),
      resolveLinkDeadline: jest.fn().mockReturnValue(null),
      isPasswordRequired: jest.fn().mockReturnValue(false),
      verifyPassword: jest.fn().mockResolvedValue(true),
      effectiveAccessLevel: jest.fn().mockReturnValue(InviteAccessLevel.ANYONE),
      assertCanManage: jest.fn().mockResolvedValue(undefined),
      toPublic: jest.fn((v: unknown) => v),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        InvitationsService,
        IdentityVerificationGateClient,
        { provide: getRepositoryToken(Invitation), useValue: repo },
        { provide: ConfigService, useValue: { get: jest.fn((k: string) => (k === 'RABBITMQ_URL' ? 'amqp://test-broker' : undefined)) } },
        { provide: UserServiceClient, useValue: userService },
        { provide: InviteSettingsService, useValue: inviteSettings },
        { provide: InvitationEventsService, useValue: events },
        { provide: 'RABBITMQ_CLIENT', useValue: rabbit },
        { provide: IDENTITY_VERIFICATION_CLIENT, useValue: identityClient },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Same global wiring as main.ts.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new InvitationExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const accept = (route: string, token = 'legacy-token') =>
    request(app.getHttpServer())
      .post(route)
      .set('x-user-id', INVITEE.id)
      .set('x-user-email', INVITEE.email)
      .send({ token });

  // Every mutation and side effect acceptance can produce, plus the token
  // lookup itself: a blocked acceptance must not have started.
  const expectNothingHappened = () => {
    expect(userService.addTeamMember).not.toHaveBeenCalled();
    expect(userService.addCompanyMember).not.toHaveBeenCalled();
    expect(userService.syncUserProfile).not.toHaveBeenCalled();
    expect(userService.dismissOnboarding).not.toHaveBeenCalled();
    expect(userService.getUserSummary).not.toHaveBeenCalled();
    expect(userService.getUserSummaryByEmail).not.toHaveBeenCalled();
    expect(userService.getCompany).not.toHaveBeenCalled();
    expect(userService.getCompanyMemberCount).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.findOne).not.toHaveBeenCalled();
    expect(events.accepted).not.toHaveBeenCalled();
    expect(rabbit.emit).not.toHaveBeenCalled();
  };

  describe.each(ROUTES)('POST %s', (route) => {
    it('continues to accept the invitation when identity and location are both verified', async () => {
      gateReplies(OPEN_VERIFIED);

      const res = await accept(route);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'inv-1', status: 'accepted', teamId: 'team-1' });
      expect(userService.addCompanyMember).toHaveBeenCalledTimes(1);
      expect(userService.addTeamMember).toHaveBeenCalledTimes(1);
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(events.accepted).toHaveBeenCalledTimes(1);
      expect(rabbit.emit).toHaveBeenCalled();
    });

    it('asks identity-verification-service about the acting user, over the RabbitMQ gate pattern', async () => {
      gateReplies(OPEN_VERIFIED);

      await accept(route);

      expect(identityClient.send).toHaveBeenCalledTimes(1);
      const [pattern, record] = identityClient.send.mock.calls[0];
      expect(pattern).toBe(ACCOUNT_GATE_CHECK_PATTERN);
      expect(record.data).toEqual({ userId: INVITEE.id });
    });

    it('continues while the account is inside its expiry grace period', async () => {
      gateReplies(OPEN_IN_GRACE);

      const res = await accept(route);

      expect(res.status).toBe(201);
      expect(userService.addTeamMember).toHaveBeenCalledTimes(1);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['identity and location both missing', CLOSED_BOTH, 'both'],
      ['identity missing only', CLOSED_IDENTITY, 'identity'],
      ['location missing only', CLOSED_LOCATION, 'location'],
      ['no identity-verification profile at all', CLOSED_NO_PROFILE, 'both'],
    ])('blocks with a structured error when %s, and leaves no trace', async (_label, decision, missing) => {
      gateReplies(decision);

      const res = await accept(route);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        success: false,
        error: 'VERIFICATION_REQUIRED',
        message: expect.any(String),
        missingRequirements: missing,
      });
      expectNothingHappened();
    });

    it('never leaks status values, vendor or document detail in the blocked response', async () => {
      gateReplies(CLOSED_IDENTITY);

      const res = await accept(route);

      expect(Object.keys(res.body).sort()).toEqual(['error', 'message', 'missingRequirements', 'success']);
      expect(JSON.stringify(res.body)).not.toMatch(/unstarted|not_verified|verified|expired|failed|attempt|vendor|document/i);
    });

    it('blocks before the token is even looked up, so a bad token from an unverified user learns nothing', async () => {
      gateReplies(CLOSED_BOTH);

      const res = await accept(route, 'not-a-real-token');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('VERIFICATION_REQUIRED');
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('fails closed with a service-unavailable error when identity-verification-service errors', async () => {
      identityClient.send.mockReturnValue(throwError(() => new Error('no consumer on queue')));

      const res = await accept(route);

      expect(res.status).toBe(503);
      expect(res.body).toEqual({
        success: false,
        error: 'IDENTITY_VERIFICATION_UNAVAILABLE',
        message: expect.any(String),
      });
      expectNothingHappened();
    });

    it.each([
      ['an empty reply', undefined],
      ['a non-object reply', 'open'],
      ['a reply with no gateOpen', { ...OPEN_VERIFIED, gateOpen: undefined }],
      ['a non-boolean gateOpen', { ...OPEN_VERIFIED, gateOpen: 'yes' }],
      ['a missing missingRequirements', { ...OPEN_VERIFIED, missingRequirements: undefined }],
      ['a non-string missingRequirements', { ...OPEN_VERIFIED, missingRequirements: 7 }],
      ['a closed gate with no missingRequirements at all', { gateOpen: false }],
      ['an open gate with no missingRequirements at all', { gateOpen: true }],
      ['an array', []],
      ['an unknown missingRequirements value', { ...CLOSED_BOTH, missingRequirements: 'everything' }],
      ['an open gate that still lists a missing requirement (identity)', { ...OPEN_VERIFIED, missingRequirements: 'identity' }],
      ['an open gate that still lists a missing requirement (location)', { ...OPEN_IN_GRACE, missingRequirements: 'location' }],
      ['an open gate that still lists a missing requirement (both)', { ...OPEN_VERIFIED, missingRequirements: 'both' }],
      ['a closed gate that claims nothing is missing', { ...CLOSED_BOTH, missingRequirements: 'none' }],
    ])('fails closed on %s — neither read as open nor rewritten into a block', async (_label, malformed) => {
      gateReplies(malformed);

      const res = await accept(route);

      expect(res.status).toBe(503);
      expect(res.body).toEqual({
        success: false,
        error: 'IDENTITY_VERIFICATION_UNAVAILABLE',
        message: expect.any(String),
      });
      expectNothingHappened();
    });

    it('leaves existing acceptance behavior untouched once the gate is open (bad token still 410 INVALID_TOKEN)', async () => {
      gateReplies(OPEN_VERIFIED);
      repo.findOne.mockResolvedValue(null);

      const res = await accept(route, 'not-a-real-token');

      expect(res.status).toBe(410);
      expect(res.body.error).toBe('INVALID_TOKEN');
      expect(userService.addTeamMember).not.toHaveBeenCalled();
    });
  });

  it('serves both accept routes from one controller handler, so they cannot enforce differently', () => {
    const paths = Reflect.getMetadata('path', InvitationsController);
    expect(paths).toEqual(['invitations', 'v1/invitations']);
    expect(Reflect.getMetadata('path', InvitationsController.prototype.accept)).toBe('accept');
  });

  describe('everything except acceptance stays ungated (TRVG2 section 2.6: issue, resend, cancel, links)', () => {
    const asInviter = (req: request.Test) => req.set('x-user-id', 'inviter-1').set('x-user-email', 'inviter@example.com');
    // Whatever each route answers with the mocked repositories, it must never
    // have asked identity-verification-service anything.
    it.each([
      ['create', () => asInviter(request(app.getHttpServer()).post('/invitations')).send({ teamId: '11111111-1111-4111-8111-111111111111', emails: ['new@example.com'] })],
      ['create link', () => asInviter(request(app.getHttpServer()).post('/invitations/link')).send({ teamId: 'team-1', teamName: 'Acme' })],
      ['resend', () => asInviter(request(app.getHttpServer()).post('/invitations/inv-1/resend'))],
      ['cancel', () => asInviter(request(app.getHttpServer()).delete('/invitations/inv-1/cancel'))],
      ['share link', () => asInviter(request(app.getHttpServer()).post('/invitations/share-link')).send({})],
    ])('%s never consults the verification gate', async (_name, call) => {
      await call();
      expect(identityClient.send).not.toHaveBeenCalled();
    });

    it('the gate is called from exactly one place in the service: accept()', () => {
      const source = readFileSync(join(__dirname, 'invitations.service.ts'), 'utf8');
      expect((source.match(/assertVerificationGateOpen\(/g) ?? []).length).toBe(2); // definition + the single call in accept()
      expect((source.match(/identityGate\./g) ?? []).length).toBe(1);
    });
  });
});

describe('IdentityVerificationGateClient', () => {
  const configWith = (vars: Record<string, string | undefined>) => ({ get: jest.fn((k: string) => vars[k]) }) as any;
  const buildClient = (send: jest.Mock, vars: Record<string, string | undefined> = { RABBITMQ_URL: 'amqp://test-broker' }) =>
    new IdentityVerificationGateClient({ send } as any, configWith(vars));

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fails closed when identity-verification-service never replies within the bounded timeout', async () => {
    jest.useFakeTimers();
    const send = jest.fn().mockReturnValue(new Observable(() => undefined)); // never emits
    const client = buildClient(send);

    const outcome = client.checkGate('user-1').then(
      () => 'resolved',
      (err) => err,
    );
    await jest.advanceTimersByTimeAsync(IDENTITY_GATE_TIMEOUT_MS + 1);

    await expect(outcome).resolves.toBeInstanceOf(IdentityVerificationUnavailableException);
  });

  it('bounds the timeout and sets the same TTL on the message so a stale request cannot be answered later', async () => {
    const send = jest.fn().mockReturnValue(of(OPEN_VERIFIED));

    await buildClient(send).checkGate('user-1');

    expect(IDENTITY_GATE_TIMEOUT_MS).toBeLessThanOrEqual(5000);
    const record = send.mock.calls[0][1];
    expect(record.options.expiration).toBe(IDENTITY_GATE_TIMEOUT_MS);
  });

  it('returns the decision unchanged for a well-formed reply', async () => {
    const send = jest.fn().mockReturnValue(of(OPEN_IN_GRACE));

    await expect(buildClient(send).checkGate('user-1')).resolves.toEqual({
      gateOpen: true,
      missingRequirements: 'none',
    });
  });

  it('returns only the two contract fields, even if a reply carries extra ones (raw statuses, grace flag)', async () => {
    const send = jest.fn().mockReturnValue(
      of({
        ...OPEN_VERIFIED,
        inGrace: true,
        identityVerificationStatus: 'expired',
        locationVerificationStatus: 'verified',
        expiredAt: '2026-10-01T00:00:00.000Z',
      }),
    );

    const decision = await buildClient(send).checkGate('user-1');

    expect(Object.keys(decision).sort()).toEqual(['gateOpen', 'missingRequirements']);
    expect(decision).toEqual({ gateOpen: true, missingRequirements: 'none' });
  });

  it.each([
    ['open requires none', { gateOpen: true, missingRequirements: 'none' }, true],
    ['closed names identity', { gateOpen: false, missingRequirements: 'identity' }, true],
    ['closed names location', { gateOpen: false, missingRequirements: 'location' }, true],
    ['closed names both', { gateOpen: false, missingRequirements: 'both' }, true],
    ['open naming identity is contradictory', { gateOpen: true, missingRequirements: 'identity' }, false],
    ['closed naming none is contradictory', { gateOpen: false, missingRequirements: 'none' }, false],
  ])('contract: %s', async (_label, wire, accepted) => {
    const send = jest.fn().mockReturnValue(of(wire));
    const outcome = buildClient(send).checkGate('user-1');
    if (accepted) await expect(outcome).resolves.toEqual(wire);
    else await expect(outcome).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
  });

  it('fails closed WITHOUT sending when no broker is configured (neither RABBITMQ_URI nor RABBITMQ_URL)', async () => {
    const send = jest.fn().mockReturnValue(of(OPEN_VERIFIED));

    await expect(buildClient(send, {}).checkGate('user-1')).rejects.toBeInstanceOf(
      IdentityVerificationUnavailableException,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('treats a blank broker value as not configured', async () => {
    const send = jest.fn().mockReturnValue(of(OPEN_VERIFIED));

    await expect(buildClient(send, { RABBITMQ_URI: '  ', RABBITMQ_URL: '' }).checkGate('user-1')).rejects.toBeInstanceOf(
      IdentityVerificationUnavailableException,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('resolves RABBITMQ_URI first, then RABBITMQ_URL', () => {
    expect(resolveBrokerUrl(configWith({ RABBITMQ_URI: 'amqp://a', RABBITMQ_URL: 'amqp://b' }))).toBe('amqp://a');
    expect(resolveBrokerUrl(configWith({ RABBITMQ_URL: 'amqp://b' }))).toBe('amqp://b');
    expect(resolveBrokerUrl(configWith({}))).toBe('');
  });
});

import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Invitation, InvitationStatus } from '../entities/invitation.entity';
import { InvitationExceptionFilter } from '../filters/invitation-exception.filter';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { InvitationEventsService } from './invitation-events.service';
import { UserServiceClient } from './user-service.client';

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

describe('invitation acceptance - not verification-gated (PMCM-652)', () => {
  let app: INestApplication;
  let repo: { findOne: jest.Mock; save: jest.Mock; update: jest.Mock; find: jest.Mock; create: jest.Mock };
  let userService: Record<string, jest.Mock>;
  let events: Record<string, jest.Mock>;
  let rabbit: { emit: jest.Mock };

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

    const moduleRef = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        InvitationsService,
        { provide: getRepositoryToken(Invitation), useValue: repo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: UserServiceClient, useValue: userService },
        { provide: InvitationEventsService, useValue: events },
        { provide: 'RABBITMQ_CLIENT', useValue: rabbit },
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

  describe.each(ROUTES)('POST %s', (route) => {
    it('accepts the invitation for an unverified user, with no verification check of any kind', async () => {
      // No identity-verification client is even provided to this module: acceptance
      // must not depend on one, so an unverified account cannot be refused here.
      const res = await accept(route);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'inv-1', status: 'accepted', teamId: 'team-1' });
      expect(userService.addCompanyMember).toHaveBeenCalledTimes(1);
      expect(userService.addTeamMember).toHaveBeenCalledTimes(1);
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(events.accepted).toHaveBeenCalledTimes(1);
    });

    it('never answers VERIFICATION_REQUIRED or IDENTITY_VERIFICATION_UNAVAILABLE', async () => {
      const res = await accept(route);

      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(503);
      expect(JSON.stringify(res.body)).not.toMatch(/VERIFICATION_REQUIRED|IDENTITY_VERIFICATION_UNAVAILABLE/);
    });

    it('keeps existing acceptance behavior (bad token still 410 INVALID_TOKEN)', async () => {
      repo.findOne.mockResolvedValue(null);

      const res = await accept(route, 'not-a-real-token');

      expect(res.status).toBe(410);
      expect(res.body.error).toBe('INVALID_TOKEN');
      expect(userService.addTeamMember).not.toHaveBeenCalled();
    });
  });

  it('serves both accept routes from one controller handler', () => {
    const paths = Reflect.getMetadata('path', InvitationsController);
    expect(paths).toEqual(['invitations', 'v1/invitations']);
    expect(Reflect.getMetadata('path', InvitationsController.prototype.accept)).toBe('accept');
  });
});

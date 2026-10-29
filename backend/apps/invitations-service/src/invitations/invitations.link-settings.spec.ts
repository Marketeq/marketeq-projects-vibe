import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { Invitation, InvitationStatus } from '../entities/invitation.entity';
import {
  InviteAccessLevel,
  InviteSettings,
  LinkExpirationPreset,
} from '../entities/invite-settings.entity';
import { InvitationExceptionFilter } from '../filters/invitation-exception.filter';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { InviteSettingsService } from './invite-settings.service';
import { InvitationEventsService } from './invitation-events.service';
import { UserServiceClient } from './user-service.client';
import { generateInviteLinkToken } from '../auth/token.util';

// backend/jest.config.js has no moduleNameMapper for the @libs/* tsconfig paths.
jest.mock(
  '@libs/auth',
  () => {
    const { SetMetadata } = jest.requireActual('@nestjs/common');
    return { IS_PUBLIC_KEY: 'isPublic', Public: () => SetMetadata('isPublic', true) };
  },
  { virtual: true },
);

const TEAM_ID = '3581d2a8-dea3-45f4-a1d3-6897f83a56d1';
const OWNER = { id: TEAM_ID, email: 'owner@example.com' };
const ARRIVAL = { id: 'user-9', email: 'arrival@example.com' };
const DAY_MS = 24 * 60 * 60 * 1000;

const settingsRow = (over: Partial<InviteSettings> = {}): InviteSettings =>
  ({
    accountId: TEAM_ID,
    userTracking: false,
    guestSharing: false,
    accessRestricted: false,
    accessLevel: InviteAccessLevel.ANYONE,
    linkExpirationEnabled: true,
    linkExpirationPreset: LinkExpirationPreset.DAYS_30,
    linkExpiresAt: null,
    passwordEnabled: false,
    passwordHash: null,
    notificationAlerts: true,
    embedCode: false,
    ...over,
  }) as InviteSettings;

/**
 * Link Settings are only enforceable at the moment somebody arrives on a
 * link, and the invite-link path of accept() is the only place that happens.
 * These drive it end to end through the controller, with the verification
 * gate held open so the only thing that can refuse an arrival is the setting
 * under test.
 */
describe('invite links obey Link Settings (R3-02)', () => {
  let app: INestApplication;
  let invitationRepo: Record<string, jest.Mock>;
  let settingsRepo: Record<string, jest.Mock>;
  let userService: Record<string, jest.Mock>;
  let pendingForArrival: Invitation | null;

  const ORIGINAL_SECRET = process.env.INVITE_TOKEN_SECRET;
  beforeAll(() => {
    process.env.INVITE_TOKEN_SECRET = 'test-only-invite-token-secret-32-chars-min';
  });
  afterAll(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.INVITE_TOKEN_SECRET;
    else process.env.INVITE_TOKEN_SECRET = ORIGINAL_SECRET;
  });

  /** A link token as createInviteLink mints one, minted `ageMs` ago. */
  const linkToken = (ageMs = 0) => {
    const issuedAt = Date.now() - ageMs;
    const token = generateInviteLinkToken({
      teamId: TEAM_ID,
      role: 'viewer',
      teamName: 'Alliance Corp.',
      invitedBy: OWNER.id,
      invitedByEmail: OWNER.email,
      iat: issuedAt,
      exp: issuedAt + 100 * 365 * DAY_MS,
    } as any);
    return token;
  };

  beforeEach(async () => {
    pendingForArrival = null;

    invitationRepo = {
      // Null so accept() falls through to the invite-link path, which is the
      // only path Link Settings govern.
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((v: unknown) => Promise.resolve(v)),
      create: jest.fn().mockImplementation((v: unknown) => v),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getOne: jest.fn(() => Promise.resolve(pendingForArrival)),
        getMany: jest.fn(() => Promise.resolve([])),
      })),
    };

    settingsRepo = {
      findOne: jest.fn().mockResolvedValue(settingsRow()),
      save: jest.fn().mockImplementation((v: unknown) => Promise.resolve(v)),
      create: jest.fn().mockImplementation((v: unknown) => v),
    };

    userService = {
      addTeamMember: jest.fn().mockResolvedValue(true),
      addCompanyMember: jest.fn().mockResolvedValue(true),
      getUserSummary: jest.fn().mockResolvedValue({
        id: ARRIVAL.id,
        email: ARRIVAL.email,
        onboardingDismissed: true,
      }),
      getUserSummaryByEmail: jest.fn().mockResolvedValue(null),
      getCompany: jest.fn().mockResolvedValue(null),
      getCompanyMembership: jest.fn().mockResolvedValue(null),
      checkCompanyMembership: jest.fn().mockResolvedValue(false),
      getCompanyMemberByEmail: jest.fn().mockResolvedValue(null),
      getCompanyMemberCount: jest.fn().mockResolvedValue(1),
      dismissOnboarding: jest.fn().mockResolvedValue({
        id: ARRIVAL.id,
        email: ARRIVAL.email,
        role: 'member',
        onboardingDismissed: true,
        hasCompletedOnboarding: true,
        isActive: true,
      }),
      syncUserProfile: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        InvitationsService,
        InviteSettingsService,
        { provide: getRepositoryToken(Invitation), useValue: invitationRepo },
        { provide: getRepositoryToken(InviteSettings), useValue: settingsRepo },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((k: string) =>
              k === 'RABBITMQ_URL' ? 'amqp://test-broker' : undefined,
            ),
          },
        },
        { provide: UserServiceClient, useValue: userService },
        {
          provide: InvitationEventsService,
          useValue: {
            accepted: jest.fn(),
            created: jest.fn(),
            resent: jest.fn(),
            revoked: jest.fn(),
          },
        },
        { provide: 'RABBITMQ_CLIENT', useValue: { emit: jest.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new InvitationExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const accept = (body: Record<string, unknown>, who = ARRIVAL) =>
    request(app.getHttpServer())
      .post('/invitations/accept')
      .set('x-user-id', who.id)
      .set('x-user-email', who.email)
      .send(body);

  describe('Who Has Access', () => {
    it('lets anyone through on the default setting', async () => {
      await accept({ token: linkToken() }).expect(201);
      expect(userService.addTeamMember).toHaveBeenCalled();
    });

    it('ignores a restrictive level while the switch is off', async () => {
      settingsRepo.findOne.mockResolvedValue(
        settingsRow({
          accessRestricted: false,
          accessLevel: InviteAccessLevel.OWNER_ONLY,
        }),
      );

      await accept({ token: linkToken() }).expect(201);
    });

    it('turns the link off for everyone but the owner on Owner Only', async () => {
      settingsRepo.findOne.mockResolvedValue(
        settingsRow({
          accessRestricted: true,
          accessLevel: InviteAccessLevel.OWNER_ONLY,
        }),
      );

      const res = await accept({ token: linkToken() }).expect(403);
      expect(res.body.error).toBe('LINK_ACCESS_DENIED');
      // Refused before anything was written.
      expect(userService.addTeamMember).not.toHaveBeenCalled();
    });

    it('still admits the owner themselves on Owner Only', async () => {
      settingsRepo.findOne.mockResolvedValue(
        settingsRow({
          accessRestricted: true,
          accessLevel: InviteAccessLevel.OWNER_ONLY,
        }),
      );

      await accept({ token: linkToken() }, OWNER).expect(201);
    });

    it('admits an Only Invited Guests arrival who holds a pending invitation', async () => {
      settingsRepo.findOne.mockResolvedValue(
        settingsRow({
          accessRestricted: true,
          accessLevel: InviteAccessLevel.INVITED_GUESTS,
        }),
      );
      pendingForArrival = {
        id: 'inv-1',
        invitedEmail: ARRIVAL.email,
        status: InvitationStatus.PENDING,
      } as Invitation;

      await accept({ token: linkToken() }).expect(201);
    });

    it('refuses an Only Invited Guests arrival who holds none', async () => {
      settingsRepo.findOne.mockResolvedValue(
        settingsRow({
          accessRestricted: true,
          accessLevel: InviteAccessLevel.INVITED_GUESTS,
        }),
      );
      pendingForArrival = null;

      const res = await accept({ token: linkToken() }).expect(403);
      expect(res.body.error).toBe('LINK_ACCESS_DENIED');
    });

    it('says nothing about the account behind the link when it refuses', async () => {
      settingsRepo.findOne.mockResolvedValue(
        settingsRow({
          accessRestricted: true,
          accessLevel: InviteAccessLevel.OWNER_ONLY,
        }),
      );

      const res = await accept({ token: linkToken() }).expect(403);
      // An invite link is a URL anyone can hold; its errors must not
      // describe the account, the owner, or which rule rejected them.
      const body = JSON.stringify(res.body);
      expect(body).not.toContain(TEAM_ID);
      expect(body).not.toContain(OWNER.email);
      expect(body).not.toContain('owner_only');
    });
  });

  describe('Enable Link Password', () => {
    const withPassword = async (plain: string) =>
      settingsRepo.findOne.mockResolvedValue(
        settingsRow({
          passwordEnabled: true,
          passwordHash: await bcrypt.hash(plain, 10),
        }),
      );

    it('asks for the password when one is set', async () => {
      await withPassword('open-sesame');

      const res = await accept({ token: linkToken() }).expect(401);
      expect(res.body.error).toBe('LINK_PASSWORD_REQUIRED');
      expect(userService.addTeamMember).not.toHaveBeenCalled();
    });

    it('separates a wrong password from a missing one', async () => {
      await withPassword('open-sesame');

      const res = await accept({
        token: linkToken(),
        linkPassword: 'not-it',
      }).expect(401);
      expect(res.body.error).toBe('LINK_PASSWORD_INVALID');
    });

    it('admits the arrival with the right password', async () => {
      await withPassword('open-sesame');

      await accept({ token: linkToken(), linkPassword: 'open-sesame' }).expect(201);
      expect(userService.addTeamMember).toHaveBeenCalled();
    });

    it('does not gate on a password that is enabled but never set', async () => {
      settingsRepo.findOne.mockResolvedValue(
        settingsRow({ passwordEnabled: true, passwordHash: null }),
      );

      await accept({ token: linkToken() }).expect(201);
    });
  });

  describe('Allow Link Expiration After', () => {
    it('refuses a link older than the configured window', async () => {
      settingsRepo.findOne.mockResolvedValue(
        settingsRow({ linkExpirationPreset: LinkExpirationPreset.DAYS_15 }),
      );

      const res = await accept({ token: linkToken(16 * DAY_MS) }).expect(410);
      expect(res.body.error).toBe('TOKEN_EXPIRED');
    });

    it('admits a link still inside it', async () => {
      settingsRepo.findOne.mockResolvedValue(
        settingsRow({ linkExpirationPreset: LinkExpirationPreset.DAYS_15 }),
      );

      await accept({ token: linkToken(14 * DAY_MS) }).expect(201);
    });

    it('shortens an old link the moment the window is narrowed', async () => {
      // The point of reading settings live rather than baking them into the
      // token: a link copied 20 days ago stops working as soon as somebody
      // moves the setting to 15 days.
      settingsRepo.findOne.mockResolvedValue(
        settingsRow({ linkExpirationPreset: LinkExpirationPreset.DAYS_30 }),
      );
      await accept({ token: linkToken(20 * DAY_MS) }).expect(201);

      settingsRepo.findOne.mockResolvedValue(
        settingsRow({ linkExpirationPreset: LinkExpirationPreset.DAYS_15 }),
      );
      await accept({ token: linkToken(20 * DAY_MS) }).expect(410);
    });

    it('never expires when the control is switched off', async () => {
      settingsRepo.findOne.mockResolvedValue(
        settingsRow({ linkExpirationEnabled: false }),
      );

      await accept({ token: linkToken(5 * 365 * DAY_MS) }).expect(201);
    });
  });
});

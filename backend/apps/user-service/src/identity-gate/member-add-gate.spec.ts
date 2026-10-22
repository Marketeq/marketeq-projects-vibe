import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { Observable, of, throwError, NEVER } from 'rxjs';
import * as request from 'supertest';
import { TeamsController } from '../teams/teams.controller';
import { TeamsInternalController } from '../teams/teams-internal.controller';
import { TeamsService } from '../teams/teams.service';
import { TeamMember } from '../teams/teams.entity';
import { CompaniesInternalController } from '../companies/companies-internal.controller';
import { CompaniesService } from '../companies/companies.service';
import { Company } from '../companies/entities/company.entity';
import { CompanyUser } from '../companies/entities/company-user.entity';
import { User } from '../user/entities/user.entity';
import { MemberAddGate } from './member-add-gate';
import { IDENTITY_VERIFICATION_CLIENT, IdentityVerificationGateClient } from './identity-verification-gate.client';

// G7 (Christopher): a person added to a team or company by a DIRECT route must pass
// the same verification gate as one who joins by accepting an invitation
// (invitations-service: 403 VERIFICATION_REQUIRED / 503 IDENTITY_VERIFICATION_UNAVAILABLE,
// envelope { success: false, error, message }). The gate applies to the RESULTING
// membership, so the person being added is checked - never the owner/admin adding them.

const ADMIN = '11111111-1111-4111-8111-111111111111';
const VERIFIED = '22222222-2222-4222-8222-222222222222';
const GRACE = '33333333-3333-4333-8333-333333333333';
const UNVERIFIED = '44444444-4444-4444-8444-444444444444';
const EXPIRED = '55555555-5555-4555-8555-555555555555';
const EXISTING = '66666666-6666-4666-8666-666666666666';
const TEAM = ADMIN; // a team is keyed by its owner's user id
const COMPANY = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TOKEN = 'internal-secret';

const OPEN = { gateOpen: true, missingRequirements: 'none' };
const CLOSED = (m = 'both') => ({ gateOpen: false, missingRequirements: m });
const IDENTITY: Record<string, any> = {
  [ADMIN]: OPEN, [VERIFIED]: OPEN, [GRACE]: OPEN /* identity reports in-grace as open */,
  [UNVERIFIED]: CLOSED('both'), [EXPIRED]: CLOSED('identity'), [EXISTING]: CLOSED('both'),
};

describe('G7 - direct team / company member-add routes are gated on the person being added', () => {
  let app: INestApplication;
  let transport: jest.Mock;
  let brokerUrl: string | undefined;
  let teamRows: any[];
  let companyRows: any[];
  let writes: string[];

  const build = async (impl?: (pattern: string, record: any) => Observable<unknown>) => {
    await app?.close();
    transport = jest.fn(impl ?? ((_p, record) => of(IDENTITY[record.data.userId] ?? CLOSED('both'))));
    brokerUrl = 'amqp://test';
    teamRows = [{ id: 't0', teamId: TEAM, userId: ADMIN, role: 'owner' }, { id: 't1', teamId: TEAM, userId: EXISTING, role: 'member' }];
    companyRows = [{ id: 'c0', companyId: COMPANY, userId: EXISTING, role: 'viewer', permissions: [] }];
    writes = [];

    const teamRepo = {
      findOne: jest.fn(async ({ where }: any) => teamRows.find((r) => r.teamId === where.teamId && r.userId === where.userId) ?? null),
      create: jest.fn((d: any) => ({ id: `new-${teamRows.length}`, ...d })),
      save: jest.fn(async (e: any) => (writes.push(`team:${e.userId}`), teamRows.push(e), e)),
    };
    const companyUserRepo = {
      findOne: jest.fn(async ({ where }: any) => companyRows.find((r) => r.companyId === where.companyId && r.userId === where.userId) ?? null),
      create: jest.fn((d: any) => ({ id: `newc-${companyRows.length}`, ...d })),
      save: jest.fn(async (e: any) => (writes.push(`company:${e.userId}`), companyRows.find((r) => r.id === e.id) ?? companyRows.push(e), e)),
    };
    const companyRepo = { findOne: jest.fn(async ({ where }: any) => (where.id === COMPANY ? { id: COMPANY, ownerUserId: ADMIN } : null)) };

    const moduleRef = await Test.createTestingModule({
      controllers: [TeamsController, TeamsInternalController, CompaniesInternalController],
      providers: [
        TeamsService, CompaniesService, MemberAddGate, IdentityVerificationGateClient,
        { provide: IDENTITY_VERIFICATION_CLIENT, useValue: { send: transport } },
        { provide: getRepositoryToken(TeamMember), useValue: teamRepo },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Company), useValue: companyRepo },
        { provide: getRepositoryToken(CompanyUser), useValue: companyUserRepo },
        { provide: getDataSourceToken(), useValue: {} },
        { provide: ConfigService, useValue: { get: (k: string) => (k === 'INTERNAL_SERVICE_TOKEN' ? TOKEN : k === 'RABBITMQ_URL' ? brokerUrl : undefined) } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use((req: any, _res: any, next: any) => {
      if (req.headers['x-test-user']) req.user = { sub: req.headers['x-test-user'] };
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  };

  afterEach(async () => {
    await app?.close();
  });

  const addTeam = (userId: string, extra: Record<string, unknown> = {}) =>
    request(app.getHttpServer()).post(`/teams/${TEAM}/members`).set('x-test-user', ADMIN).send({ userId, ...extra });
  const addTeamInternal = (userId: string) =>
    request(app.getHttpServer()).post(`/internal/teams/${TEAM}/members`).set('x-internal-token', TOKEN).send({ userId });
  const addCompany = (userId: string, extra: Record<string, unknown> = {}) =>
    request(app.getHttpServer()).post(`/internal/companies/${COMPANY}/members`).set('x-internal-token', TOKEN).send({ userId, ...extra });
  const askedAbout = () => transport.mock.calls.map((c) => c[1].data.userId);

  const routes: Array<[string, (u: string, e?: Record<string, unknown>) => request.Test, () => string[]]> = [
    ['POST /teams/:teamId/members', (u, e) => addTeam(u, e), () => teamRows.map((r) => r.userId)],
    ['POST /internal/teams/:teamId/members', (u) => addTeamInternal(u), () => teamRows.map((r) => r.userId)],
    ['POST /internal/companies/:id/members', (u, e) => addCompany(u, e), () => companyRows.map((r) => r.userId)],
  ];

  describe.each(routes)('%s', (_name, add, members) => {
    beforeEach(() => build());

    it('a verified person can be added', async () => {
      const res = await add(VERIFIED);
      expect(res.status).toBe(201);
      expect(members()).toContain(VERIFIED);
    });

    it('a person inside the grace period (gate open) can be added', async () => {
      expect((await add(GRACE)).status).toBe(201);
      expect(members()).toContain(GRACE);
    });

    it.each([['unverified', UNVERIFIED], ['expired', EXPIRED]])(
      'an %s person gets the invitation-acceptance error: 403 VERIFICATION_REQUIRED, nothing created',
      async (_l, user) => {
        const res = await add(user);
        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({ success: false, error: 'VERIFICATION_REQUIRED' });
        expect(typeof res.body.message).toBe('string');
        expect(members()).not.toContain(user);
        expect(writes).toEqual([]);
      },
    );

    it('does not disclose what the refused person still has to verify', async () => {
      const res = await add(UNVERIFIED);
      expect(res.body).not.toHaveProperty('missingRequirements');
      expect(JSON.stringify(res.body)).not.toMatch(/identity|location|grace|expired|travel/i);
    });

    it('only the person being added is checked - never the owner/admin or the caller', async () => {
      await add(VERIFIED);
      expect(askedAbout()).toEqual([VERIFIED]);
      expect(askedAbout()).not.toContain(ADMIN);
    });

    it('an admin whose own gate is closed can still add a verified person (the actor has no effect)', async () => {
      await build((_p, r) => of(r.data.userId === ADMIN ? CLOSED('both') : IDENTITY[r.data.userId]));
      expect((await add(VERIFIED)).status).toBe(201);
      expect(askedAbout()).not.toContain(ADMIN);
    });

    it('verification values in the request cannot bypass the gate', async () => {
      const res = await add(UNVERIFIED, { gateOpen: true, verified: true, isVerified: true, missingRequirements: 'none', identityVerificationStatus: 'verified' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('VERIFICATION_REQUIRED');
      expect(members()).not.toContain(UNVERIFIED);
      expect(askedAbout()).toEqual([UNVERIFIED]); // identity was asked regardless of the body
    });

    it('an existing member is not a new membership: no gate request, nothing created', async () => {
      const res = await add(EXISTING);
      expect(res.status).toBe(201);
      expect(transport).not.toHaveBeenCalled();
    });

    describe('gate failure follows the invitation-acceptance rule: 503 IDENTITY_VERIFICATION_UNAVAILABLE, nobody added', () => {
      const failures: Array<[string, () => Observable<unknown>]> = [
        ['no consumer / RPC error', () => throwError(() => new Error('no consumer'))],
        ['unusable reply', () => of({ nope: true })],
        ['self-contradicting reply', () => of({ gateOpen: true, missingRequirements: 'identity' })],
      ];
      it.each(failures)('%s', async (_l, impl) => {
        await build(impl);
        const res = await add(VERIFIED);
        expect(res.status).toBe(503);
        expect(res.body).toMatchObject({ success: false, error: 'IDENTITY_VERIFICATION_UNAVAILABLE' });
        expect(members()).not.toContain(VERIFIED);
        expect(writes).toEqual([]);
      });

      // The 3 s bounded timeout is the same client for every route; prove it once.
      (_name.startsWith('POST /teams') ? it : it.skip)('a gate that never answers times out and adds nobody', async () => {
        await build(() => NEVER);
        const res = await add(VERIFIED);
        expect(res.status).toBe(503);
        expect(writes).toEqual([]);
      }, 15000);

      it('missing broker configuration adds nobody', async () => {
        brokerUrl = undefined;
        const res = await add(VERIFIED);
        expect(res.status).toBe(503);
        expect(writes).toEqual([]);
        expect(transport).not.toHaveBeenCalled();
      });
    });
  });

  describe('the same codes and status as gated invitation acceptance', () => {
    beforeEach(() => build());
    it('403 VERIFICATION_REQUIRED and 503 IDENTITY_VERIFICATION_UNAVAILABLE use the invitations-service envelope', async () => {
      // invitations-service: new HttpException({ success: false, error, message }, 403/503)
      const closed = await addTeam(UNVERIFIED);
      expect(Object.keys(closed.body).sort()).toEqual(['error', 'message', 'success']);
      expect(closed.body.success).toBe(false);
    });
  });

  describe('authorization and existing behaviour are unchanged', () => {
    beforeEach(() => build());
    it('a caller who is not on the team is still refused by the existing check, before any gate lookup', async () => {
      const res = await request(app.getHttpServer()).post(`/teams/${TEAM}/members`).set('x-test-user', VERIFIED).send({ userId: UNVERIFIED });
      expect(res.status).toBe(403);
      expect(transport).not.toHaveBeenCalled();
    });

    it('the internal routes still require the internal token, before any gate lookup', async () => {
      const res = await request(app.getHttpServer()).post(`/internal/teams/${TEAM}/members`).send({ userId: VERIFIED });
      expect(res.status).toBe(403);
      expect(transport).not.toHaveBeenCalled();
    });

    it('updating an existing company member\'s role is not a new membership and is not gated', async () => {
      const res = await addCompany(EXISTING, { role: 'admin' });
      expect(res.status).toBe(201);
      expect(transport).not.toHaveBeenCalled();
      expect(companyRows.find((r) => r.userId === EXISTING).role).toBe('admin');
    });

    it('an unknown company is still a 404 before any gate lookup', async () => {
      const res = await request(app.getHttpServer()).post(`/internal/companies/00000000-0000-4000-8000-000000000000/members`).set('x-internal-token', TOKEN).send({ userId: VERIFIED });
      expect(res.status).toBe(404);
      expect(transport).not.toHaveBeenCalled();
    });
  });
});

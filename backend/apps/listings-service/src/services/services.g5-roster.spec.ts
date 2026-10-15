import 'reflect-metadata';
import { INestApplication, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';
import { ServicesController } from './service.controller';
import { ServicesInternalController } from './services-internal.controller';
import { ServicesService } from './service.service';
import { Service } from './entities/service.entity';
import { ListingStatus } from '../shared/enums/listing.enum';
import { UserProfileClient } from '../shared/user-profile/user-profile.client';
import { IdentityVerificationGateClient } from '../identity-gate/identity-verification-gate.client';
import { RosterGateService } from '../identity-gate/roster-gate.service';
import { InMemoryGateState } from '../identity-gate/testing/in-memory-gate-state.testing';

// G5 (Christopher): on client-facing surfaces a member, owner or listing is shown
// only when its linked account has a KNOWN OPEN gate. Display only. Real
// controller + real ServicesService + real RosterGateService over an in-memory
// last-known gate state; the repository and profile lookup are in memory too.

const SECRET = 'test-secret';
const OWNER = '10000000-0000-4000-8000-000000000001'; // known open
const VERIFIED = '10000000-0000-4000-8000-000000000002'; // known open
const GRACE = '10000000-0000-4000-8000-000000000003'; // known open (inside grace)
const UNVERIFIED = '10000000-0000-4000-8000-000000000004'; // known closed
const LAPSED = '10000000-0000-4000-8000-000000000005'; // known closed
const NEVER_SEEN = '10000000-0000-4000-8000-000000000006'; // state never received
const CLIENT = '10000000-0000-4000-8000-000000000009'; // some other signed-in user
const MORE = ['07', '08', '09'].map((n) => `10000000-0000-4000-8000-0000000000${n}`);

const S_ONE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const S_TWO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'; // owner UNVERIFIED
const S_BIG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
const S_OWNERLESS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5';

type Row = Partial<Service> & { id: string };
const token = (sub: string) => jwt.sign({ sub }, SECRET);

describe('G5 - client-facing roster on service listings', () => {
  let app: INestApplication;
  let rows: Map<string, Row>;
  let state: InMemoryGateState;
  let gateClient: { checkGate: jest.Mock; checkGateBatch: jest.Mock };
  let writes: string[];
  let hydrateCalls: string[][];

  const row = (id: string, slug: string, owner: string | null, members: string[]): Row => ({
    id, slug, listingType: 'service', title: slug, status: ListingStatus.Published, userId: owner as any, teamMemberIds: members,
  });

  const build = async () => {
    process.env.JWT_SECRET = SECRET;
    delete process.env.AUTH_JWT_PUBLIC_KEY;
    rows = new Map<string, Row>([
      [S_ONE, row(S_ONE, 'one', OWNER, [OWNER, VERIFIED, GRACE, UNVERIFIED, LAPSED, NEVER_SEEN])],
      [S_TWO, row(S_TWO, 'two', UNVERIFIED, [UNVERIFIED, VERIFIED])],
      [S_BIG, row(S_BIG, 'big', OWNER, [UNVERIFIED, LAPSED, OWNER, VERIFIED, GRACE, ...MORE])],
      [S_OWNERLESS, row(S_OWNERLESS, 'ownerless', null, [])],
    ]);
    state = new InMemoryGateState().open(OWNER, VERIFIED, GRACE, ...MORE).closed(UNVERIFIED, LAPSED); // NEVER_SEEN: none
    gateClient = { checkGate: jest.fn(), checkGateBatch: jest.fn(async () => { throw new InternalServerErrorException('identity must not be asked while serving a roster'); }) };
    writes = [];
    hydrateCalls = [];

    const repo = {
      find: jest.fn(async () => [...rows.values()].filter((r) => r.status === ListingStatus.Published)),
      findOne: jest.fn(async ({ where }: any) => {
        const r = where?.id ? rows.get(where.id) : [...rows.values()].find((x) => x.slug === where?.slug);
        return r ? { ...r, teamMemberIds: [...(r.teamMemberIds ?? [])] } : null;
      }),
      save: jest.fn(async (e: any) => (writes.push('save'), e)),
      update: jest.fn(async () => void writes.push('update')),
      delete: jest.fn(async () => void writes.push('delete')),
      createQueryBuilder: jest.fn(() => ({ update: () => ({ set: () => ({ where: () => ({ andWhere: () => ({ execute: async () => (writes.push('qb'), { affected: 1 }) }) }) }) }) })),
      manager: {
        query: jest.fn(async (sql: string, params: any[]) => {
          if (sql.includes('user_service.users')) {
            return (params[0] as string[]).map((id) => ({ id, avatarUrl: `https://img/${id}.png`, firstName: `F-${id.slice(-2)}`, username: `u-${id.slice(-2)}` }));
          }
          return [];
        }),
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ServicesController, ServicesInternalController],
      providers: [
        ServicesService,
        { provide: RosterGateService, useValue: new RosterGateService(state.asService) },
        { provide: IdentityVerificationGateClient, useValue: gateClient },
        { provide: getRepositoryToken(Service), useValue: repo },
        { provide: 'ALGOLIA_CLIENT', useValue: { emit: () => ({ subscribe: () => undefined }) } },
        {
          provide: UserProfileClient,
          useValue: {
            hydrateTeam: jest.fn(async (ids: string[], ownerId?: string) => {
              const all = Array.from(new Set([...(ownerId ? [ownerId] : []), ...(ids ?? [])]));
              hydrateCalls.push(all);
              return all.map((id, idx) => ({
                userId: id, firstName: `F-${id.slice(-2)}`, username: `u-${id.slice(-2)}`, avatarUrl: null, location: null,
                hourlyRate: null, languages: [], skills: [], isLead: idx === 0, isOnline: false, role: id === ownerId ? 'owner' : 'member',
              }));
            }),
          },
        },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  };

  beforeEach(build);
  afterEach(async () => {
    await app?.close();
  });

  const detail = (slug: string) => request(app.getHttpServer()).get(`/v1/services/slug/${slug}`);
  const byId = (id: string) => request(app.getHttpServer()).get(`/v1/services/${id}`);
  const list = () => request(app.getHttpServer()).get('/v1/services');
  const ids = (team: Array<{ userId: string }>) => team.map((m) => m.userId);
  const HIDDEN = [UNVERIFIED, LAPSED, NEVER_SEEN];

  describe('public / client viewers - hidden members are completely absent', () => {
    it('slug detail: only known-open members (verified and grace); owner and members without an open gate are absent', async () => {
      const res = await detail('one');
      expect(res.status).toBe(200);
      expect(ids(res.body.team)).toEqual([OWNER, VERIFIED, GRACE]);
      expect(res.body.teamMemberIds).toEqual([OWNER, VERIFIED, GRACE]);
    });

    it('GET /:id: the raw member list carries no hidden member', async () => {
      const res = await byId(S_ONE);
      expect(res.status).toBe(200);
      expect(res.body.teamMemberIds).toEqual([OWNER, VERIFIED, GRACE]);
    });

    it('nothing about a hidden member survives anywhere in the response - no id, no flag, no marker', async () => {
      for (const res of [await detail('one'), await byId(S_ONE)]) {
        const raw = JSON.stringify(res.body);
        for (const id of HIDDEN) expect(raw).not.toContain(id);
        expect(raw).not.toMatch(/notShownToClients|Not shown to clients|hidden|visibility|visible|unverified|verif/i);
      }
    });

    it('a hidden member is never even fetched for hydration', async () => {
      await detail('one');
      for (const call of hydrateCalls) for (const id of HIDDEN) expect(call).not.toContain(id);
    });

    it('a member whose state was never received is omitted without blanking the known-visible ones', async () => {
      const res = await detail('one');
      expect(ids(res.body.team)).not.toContain(NEVER_SEEN);
      expect(ids(res.body.team)).toEqual(expect.arrayContaining([OWNER, VERIFIED, GRACE]));
    });

    it('a hidden OWNER is not disclosed through userId either; the listing itself stays available (direct detail)', async () => {
      const res = await detail('two');
      expect(res.status).toBe(200);
      expect(res.body.userId).toBeNull();
      expect(ids(res.body.team)).toEqual([VERIFIED]);
      const byid = await byId(S_TWO);
      expect(byid.status).toBe(200);
      expect(byid.body.userId).toBeNull();
      expect(JSON.stringify(byid.body)).not.toContain(UNVERIFIED);
    });

    it('a signed-in client (not the owner) gets exactly the public view', async () => {
      const pub = await detail('one');
      const client = await detail('one').set('Authorization', `Bearer ${token(CLIENT)}`);
      expect(ids(client.body.team)).toEqual(ids(pub.body.team));
      expect(client.body.notShownToClients).toBeUndefined();
    });
  });

  describe('owner / internal views still see everyone', () => {
    it('the listing\'s owner (authenticated) gets the complete roster', async () => {
      const res = await detail('one').set('Authorization', `Bearer ${token(OWNER)}`);
      expect(ids(res.body.team).sort()).toEqual([OWNER, VERIFIED, GRACE, UNVERIFIED, LAPSED, NEVER_SEEN].sort());
      expect(res.body.teamMemberIds).toEqual([OWNER, VERIFIED, GRACE, UNVERIFIED, LAPSED, NEVER_SEEN]);
    });

    it('GET /:id for the owner is complete too', async () => {
      const res = await byId(S_ONE).set('Authorization', `Bearer ${token(OWNER)}`);
      expect(res.body.teamMemberIds).toEqual([OWNER, VERIFIED, GRACE, UNVERIFIED, LAPSED, NEVER_SEEN]);
    });

    it('the owner view marks who clients do not see with only the neutral "Not shown to clients" - never a reason', async () => {
      const res = await detail('one').set('Authorization', `Bearer ${token(OWNER)}`);
      expect(res.body.notShownToClients.map((n: any) => n.userId).sort()).toEqual([...HIDDEN].sort());
      expect(res.body.notShownToClients.every((n: any) => n.label === 'Not shown to clients')).toBe(true);
      expect(Object.keys(res.body.notShownToClients[0]).sort()).toEqual(['label', 'userId']);
      expect(JSON.stringify(res.body.notShownToClients)).not.toMatch(/verif|identity|location|grace|expired|closed|gate/i);
    });

    it('an owner with nobody hidden gets no marker at all', async () => {
      state.open(UNVERIFIED, LAPSED, NEVER_SEEN);
      const res = await detail('one').set('Authorization', `Bearer ${token(OWNER)}`);
      expect(res.body.notShownToClients).toBeUndefined();
    });

    it('the internal service.findById RPC (service-to-service) is the raw, unfiltered record', async () => {
      const controller = app.get(ServicesController);
      const raw: any = await controller.handleFindById({ id: S_ONE });
      expect(raw.teamMemberIds).toEqual([OWNER, VERIFIED, GRACE, UNVERIFIED, LAPSED, NEVER_SEEN]);
    });
  });

  describe('the viewer comes from authentication only', () => {
    const attempts: Array<[string, (r: request.Test) => request.Test]> = [
      ['?includeUnverified=true', (r) => r.query({ includeUnverified: 'true' })],
      ['?viewer=<owner>', (r) => r.query({ viewer: OWNER, viewerId: OWNER, userId: OWNER, owner: 'true' })],
      ['x-user-id header', (r) => r.set('x-user-id', OWNER)],
      ['x-viewer-id / x-user-role headers', (r) => r.set('x-viewer-id', OWNER).set('x-user-role', 'admin')],
      ['request body', (r) => r.send({ viewerId: OWNER, includeUnverified: true })],
      ['a token for someone else', (r) => r.set('Authorization', `Bearer ${token(CLIENT)}`)],
      ['a forged token (wrong secret)', (r) => r.set('Authorization', `Bearer ${jwt.sign({ sub: OWNER }, 'not-the-secret')}`)],
      ['a malformed token', (r) => r.set('Authorization', 'Bearer not.a.jwt')],
      ['a non-bearer scheme', (r) => r.set('Authorization', `Basic ${Buffer.from(OWNER).toString('base64')}`)],
    ];
    it.each(attempts)('%s cannot elevate the viewer', async (_label, apply) => {
      const res = await apply(detail('one'));
      expect(res.status).toBe(200);
      expect(ids(res.body.team)).toEqual([OWNER, VERIFIED, GRACE]);
      expect(res.body.notShownToClients).toBeUndefined();
      const byid = await apply(byId(S_ONE));
      expect(byid.body.teamMemberIds).toEqual([OWNER, VERIFIED, GRACE]);
    });

    it('an unauthenticated or invalid token is an anonymous viewer, never an error', async () => {
      expect((await detail('one').set('Authorization', 'Bearer garbage')).status).toBe(200);
    });
  });

  describe('marketplace discovery (GET /v1/services)', () => {
    it('withholds a listing whose owner has a closed gate; keeps the others and ownerless listings', async () => {
      const res = await list();
      const slugs = res.body.map((s: any) => s.slug).sort();
      expect(slugs).toEqual(['big', 'one', 'ownerless']);
      expect(slugs).not.toContain('two');
    });

    it('withholds a listing whose owner state was never received', async () => {
      state.rows.delete(OWNER);
      const slugs = (await list()).body.map((s: any) => s.slug);
      expect(slugs).toEqual(['ownerless']);
    });

    it('the listing returns automatically when the owner\'s gate opens, and goes again when it closes', async () => {
      expect((await list()).body.map((s: any) => s.slug)).not.toContain('two');
      await state.apply(UNVERIFIED, true, new Date(Date.now() + 1000));
      expect((await list()).body.map((s: any) => s.slug)).toContain('two');
      await state.apply(UNVERIFIED, false, new Date(Date.now() + 2000));
      expect((await list()).body.map((s: any) => s.slug)).not.toContain('two');
    });

    it('the stored listing is untouched throughout: still Published, nothing written', async () => {
      const before = JSON.stringify([...rows.values()]);
      await list();
      await state.apply(UNVERIFIED, true, new Date(Date.now() + 1000));
      await list();
      await state.apply(UNVERIFIED, false, new Date(Date.now() + 2000));
      await list();
      expect(rows.get(S_TWO)?.status).toBe(ListingStatus.Published);
      expect(JSON.stringify([...rows.values()])).toBe(before);
      expect(writes).toEqual([]);
    });

    it('rosters omit closed gates from avatars, members and teamMemberIds, per listing', async () => {
      const one = (await list()).body.find((s: any) => s.slug === 'one');
      expect(one.teamMemberIds).toEqual([OWNER, VERIFIED, GRACE]);
      expect(one.teamMembers.map((m: any) => m.username)).toEqual(['u-01', 'u-02', 'u-03']);
      for (const id of HIDDEN) expect(JSON.stringify(one)).not.toContain(id);
    });

    it('closed gates drop out before the 4-avatar cap, so the cluster still fills with visible members', async () => {
      const big = (await list()).body.find((s: any) => s.slug === 'big');
      expect(big.teamAvatars).toHaveLength(4);
      expect(big.teamMembers.map((m: any) => m.username)).toEqual(['u-01', 'u-02', 'u-03', 'u-07']);
    });
  });

  describe('availability: last-known state, no synchronous identity calls', () => {
    it('serves every roster with identity completely unavailable, and never calls it', async () => {
      // gateClient.checkGateBatch throws if called; every read still works.
      await detail('one');
      await byId(S_ONE);
      await list();
      expect(gateClient.checkGateBatch).not.toHaveBeenCalled();
      expect(gateClient.checkGate).not.toHaveBeenCalled();
    });

    it('is one local state lookup per response, not one per member', async () => {
      state.reads = 0;
      await detail('one');
      expect(state.reads).toBe(1);
      state.reads = 0;
      await list();
      expect(state.reads).toBe(1);
    });

    it('an unreadable state table omits members but the page still loads (no artificial error)', async () => {
      state.readFails = true;
      const res = await detail('one');
      expect(res.status).toBe(200);
      expect(res.body.team).toEqual([]);
    });
  });
});

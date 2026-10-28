import 'reflect-metadata';
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { ServicesController } from './service.controller';
import { ServicesInternalController } from './services-internal.controller';
import { ServicesService } from './service.service';
import { Service } from './entities/service.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ListingStatus } from '../shared/enums/listing.enum';
import { UserProfileClient } from '../shared/user-profile/user-profile.client';
import { IdentityVerificationGateClient, AccountGateDecision } from '../identity-gate/identity-verification-gate.client';
import { IdentityVerificationUnavailableException } from '../identity-gate/identity-gate.exceptions';
import { RosterGateService } from '../identity-gate/roster-gate.service';

// G2: publish / republish / claim of a talent-owned (service) listing.
// Real controllers + real ServicesService over an in-memory repository; only
// the identity gate client, Algolia client and JWT guard are stubbed.

const TALENT = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const S_DRAFT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const S_PUBLISHED = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const S_SEEDED = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
const S_CREATED_ONLY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
const S_SEEDED_PUBLISHED_DRAFT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5';
const S_OTHERS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6';

type Row = Partial<Service> & { id: string };

class HeaderAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const id = req.headers['x-test-user'];
    if (!id) return false;
    req.user = { id, sub: id };
    return true;
  }
}

describe('G2 - publish gate on service listings', () => {
  let app: INestApplication;
  let rows: Map<string, Row>;
  let writes: string[];
  let algoliaEmits: unknown[];
  let gate: jest.Mock<Promise<AccountGateDecision>, [string]>;

  const OPEN: AccountGateDecision = { gateOpen: true, missingRequirements: 'none' };
  const CLOSED = (m: 'identity' | 'location' | 'both'): AccountGateDecision => ({ gateOpen: false, missingRequirements: m });

  const seedRows = () => {
    rows = new Map<string, Row>([
      [S_DRAFT, { id: S_DRAFT, listingType: 'service', title: 't', status: ListingStatus.Draft, userId: TALENT, createdBy: TALENT }],
      [S_PUBLISHED, { id: S_PUBLISHED, listingType: 'service', title: 't', status: ListingStatus.Published, userId: TALENT, createdBy: TALENT }],
      [S_SEEDED, { id: S_SEEDED, listingType: 'service', title: 't', status: ListingStatus.Published, userId: null, createdBy: 'n8n-seed' }],
      [S_CREATED_ONLY, { id: S_CREATED_ONLY, listingType: 'service', title: 't', status: ListingStatus.Draft, userId: null, createdBy: TALENT }],
      [S_SEEDED_PUBLISHED_DRAFT, { id: S_SEEDED_PUBLISHED_DRAFT, listingType: 'service', title: 't', status: ListingStatus.Draft, userId: null, createdBy: 'seed:n8n-automation' }],
      [S_OTHERS, { id: S_OTHERS, listingType: 'service', title: 't', status: ListingStatus.Draft, userId: OTHER, createdBy: OTHER }],
    ]);
  };

  beforeEach(async () => {
    seedRows();
    writes = [];
    algoliaEmits = [];
    gate = jest.fn(async () => OPEN);

    const repo = {
      find: jest.fn(async () => [...rows.values()].filter((r) => r.status === ListingStatus.Published)),
      findOne: jest.fn(async ({ where }: any) => {
        const r = where?.id ? rows.get(where.id) : [...rows.values()].find((x) => x.slug === where?.slug);
        return r && (!where.listingType || r.listingType === where.listingType) ? { ...r } : null;
      }),
      create: jest.fn((d: any) => ({ ...d })),
      save: jest.fn(async (d: any) => {
        writes.push('save');
        const row = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', listingType: 'service', ...d };
        rows.set(row.id, row);
        return row;
      }),
      update: jest.fn(async (id: string, patch: any) => {
        writes.push(`update:${JSON.stringify(patch)}`);
        rows.set(id, { ...rows.get(id)!, ...patch });
      }),
      delete: jest.fn(async (id: string) => {
        writes.push('delete');
        rows.delete(id);
      }),
      createQueryBuilder: jest.fn(() => {
        const q: any = { _set: null, _id: null };
        q.update = () => q;
        q.set = (s: any) => ((q._set = s), q);
        q.where = (_c: string, p: any) => ((q._id = p.id), q);
        q.andWhere = () => q;
        q.execute = async () => {
          writes.push('claim');
          const r = rows.get(q._id);
          if (!r || r.userId) return { affected: 0 };
          rows.set(q._id, { ...r, ...q._set });
          return { affected: 1 };
        };
        return q;
      }),
      manager: { query: jest.fn(async () => []) },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ServicesController, ServicesInternalController],
      providers: [
        ServicesService,
        { provide: getRepositoryToken(Service), useValue: repo },
        { provide: 'ALGOLIA_CLIENT', useValue: { emit: (_e: string, p: unknown) => (algoliaEmits.push(p), { subscribe: () => undefined }) } },
        { provide: UserProfileClient, useValue: { hydrateTeam: jest.fn(async () => []) } },
        { provide: IdentityVerificationGateClient, useValue: { checkGate: gate } },
        // G5 roster filtering is not under test here (see services.g5-roster.spec.ts).
        { provide: RosterGateService, useValue: { visibleUserIds: jest.fn(async () => new Set<string>()) } },
        { provide: ConfigService, useValue: { get: (k: string) => (k === 'INTERNAL_SERVICE_TOKEN' ? 'tok' : undefined) } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(HeaderAuthGuard)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, errorHttpStatusCode: 422 }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const gateCalls = () => gate.mock.calls.map((c) => c[0]);
  const as = (user: string = TALENT) => ({ 'x-test-user': user });
  const publish = (id: string, user = TALENT) => request(app.getHttpServer()).put(`/v1/services/${id}/publish`).set(as(user));
  const edit = (id: string, body: object, user = TALENT) => request(app.getHttpServer()).put(`/v1/services/${id}`).set(as(user)).send(body);
  const claim = (id: string, user = TALENT) => request(app.getHttpServer()).post(`/v1/services/${id}/claim`).set(as(user));
  const noEffects = (before: Map<string, Row>) => {
    expect(writes).toEqual([]);
    expect(algoliaEmits).toEqual([]);
    expect(rows).toEqual(before);
  };
  const snapshot = () => new Map([...rows].map(([k, v]) => [k, { ...v }]));

  describe('first publish and republish (PUT :id/publish)', () => {
    it('verified talent publishes a draft', async () => {
      const res = await publish(S_DRAFT).expect(200);
      expect(res.body.status).toBe('published');
      expect(gateCalls()).toEqual([TALENT]);
    });

    it('talent in the grace window publishes (gate reports open)', async () => {
      gate.mockResolvedValueOnce(OPEN);
      await publish(S_DRAFT).expect(200);
    });

    it('republish of a published or archived service is gated the same way', async () => {
      rows.set(S_PUBLISHED, { ...rows.get(S_PUBLISHED)!, status: ListingStatus.Archived });
      gate.mockResolvedValue(CLOSED('identity'));
      const before = snapshot();
      const res = await publish(S_PUBLISHED).expect(403);
      expect(res.body.error).toBe('VERIFICATION_REQUIRED');
      noEffects(before);
    });

    it.each([
      ['identity' as const],
      ['location' as const],
      ['both' as const],
    ])('unverified talent (%s missing) gets 403 with only their own missingRequirements and no side effects', async (m) => {
      gate.mockResolvedValue(CLOSED(m));
      const before = snapshot();
      const res = await publish(S_DRAFT).expect(403);
      expect(res.body).toEqual({
        success: false,
        error: 'VERIFICATION_REQUIRED',
        message: 'Verify your account to publish this listing.',
        missingRequirements: m,
      });
      noEffects(before);
    });
  });

  describe('identity service unavailable (fail closed)', () => {
    beforeEach(() => gate.mockRejectedValue(new IdentityVerificationUnavailableException()));

    it.each([
      ['publish', () => publish(S_DRAFT)],
      ['status-publish via update', () => edit(S_DRAFT, { status: 'published' })],
      ['create as published', () => request(app.getHttpServer()).post('/v1/services').set(as()).send({ title: 'a', description: 'b', status: 'published' })],
      ['claim', () => claim(S_SEEDED)],
    ])('%s returns 503 IDENTITY_VERIFICATION_UNAVAILABLE with zero side effects', async (_n, call) => {
      const before = snapshot();
      const res = await call().expect(503);
      expect(res.body.error).toBe('IDENTITY_VERIFICATION_UNAVAILABLE');
      expect(res.body.missingRequirements).toBeUndefined();
      noEffects(before);
    });
  });

  describe('direct-status bypasses', () => {
    it('PUT :id with status=published is gated for an unverified talent', async () => {
      gate.mockResolvedValue(CLOSED('both'));
      const before = snapshot();
      const res = await edit(S_DRAFT, { status: 'published' }).expect(403);
      expect(res.body.missingRequirements).toBe('both');
      noEffects(before);
    });

    it('PUT :id with status=published works for a verified talent', async () => {
      const res = await edit(S_DRAFT, { status: 'published' }).expect(200);
      expect(res.body.status).toBe('published');
    });

    it('POST create is gated for a published AND a draft create (PMCM-652), and writes nothing while closed', async () => {
      gate.mockResolvedValue(CLOSED('identity'));
      const before = snapshot();
      await request(app.getHttpServer()).post('/v1/services').set(as()).send({ title: 'a', description: 'b', status: 'published' }).expect(403);
      const draft = await request(app.getHttpServer()).post('/v1/services').set(as()).send({ title: 'a', description: 'b' }).expect(403);
      expect(draft.body).toMatchObject({ error: 'VERIFICATION_REQUIRED', missingRequirements: 'identity' });
      noEffects(before);
      gate.mockResolvedValue(OPEN);
      gate.mockClear();
      await request(app.getHttpServer()).post('/v1/services').set(as()).send({ title: 'a', description: 'b' }).expect(201);
      expect(gateCalls()).toEqual([TALENT]);
    });

    it('CMS sync (internal token) is gated on the real owner without disclosing requirements', async () => {
      gate.mockResolvedValue(CLOSED('identity'));
      const before = snapshot();
      const res = await request(app.getHttpServer())
        .post(`/internal/services/${S_DRAFT}/cms-sync`)
        .set('x-internal-token', 'tok')
        .send({ status: 'published' })
        .expect(403);
      expect(res.body.error).toBe('VERIFICATION_REQUIRED');
      expect(res.body.missingRequirements).toBeUndefined();
      expect(gateCalls()).toEqual([TALENT]);
      noEffects(before);
    });

    it('CMS sync of a system-seeded service (no talent owner) is exempt and never asks the gate', async () => {
      await request(app.getHttpServer())
        .post(`/internal/services/${S_SEEDED_PUBLISHED_DRAFT}/cms-sync`)
        .set('x-internal-token', 'tok')
        .send({ status: 'published' })
        .expect(201);
      expect(gateCalls()).toEqual([]);
    });

    it('CMS sync of non-publishing fields is not gated', async () => {
      gate.mockResolvedValue(CLOSED('identity'));
      await request(app.getHttpServer()).post(`/internal/services/${S_DRAFT}/cms-sync`).set('x-internal-token', 'tok').send({ title: 'x', featured: true }).expect(201);
      expect(gateCalls()).toEqual([]);
    });
  });

  describe('ownership runs before the gate', () => {
    it('another user cannot publish or edit a service (403, gate never asked, no effects)', async () => {
      const before = snapshot();
      await publish(S_OTHERS).expect(403);
      await edit(S_OTHERS, { title: 'hijack' }).expect(403);
      await edit(S_OTHERS, { status: 'published' }).expect(403);
      expect(gateCalls()).toEqual([]);
      noEffects(before);
    });

    it('an ownership failure never reveals the owner gate state (unverified owner, other caller)', async () => {
      gate.mockResolvedValue(CLOSED('identity'));
      const res = await publish(S_OTHERS).expect(403);
      expect(JSON.stringify(res.body)).not.toMatch(/VERIFICATION_REQUIRED|missingRequirements/);
    });

    it('a system-seeded (ownerless) service cannot be published or edited by a user', async () => {
      await publish(S_SEEDED_PUBLISHED_DRAFT).expect(403);
      await edit(S_SEEDED, { title: 'x' }).expect(403);
      expect(gateCalls()).toEqual([]);
    });

    it('createdBy is the owner when userId is null and createdBy is a real user id', async () => {
      await publish(S_CREATED_ONLY).expect(200);
      expect(gateCalls()).toEqual([TALENT]);
    });

    it('the gate subject is the owner, which equals the authenticated actor', async () => {
      await publish(S_DRAFT).expect(200);
      expect(gateCalls()).toEqual([TALENT]);
    });
  });

  describe('claiming a seeded service', () => {
    it('verified or in-grace talent claims it; ownership and search sync happen after the gate', async () => {
      const res = await claim(S_SEEDED).expect(201);
      expect(res.body.userId).toBe(TALENT);
      expect(gateCalls()).toEqual([TALENT]);
      expect(algoliaEmits.length).toBe(1);
    });

    it('unverified talent is blocked with no ownership, status, search or event change', async () => {
      gate.mockResolvedValue(CLOSED('location'));
      const before = snapshot();
      const res = await claim(S_SEEDED).expect(403);
      expect(res.body).toMatchObject({ error: 'VERIFICATION_REQUIRED', missingRequirements: 'location' });
      noEffects(before);
    });

    it('cannot claim a service another user created or already owns', async () => {
      const before = snapshot();
      await claim(S_OTHERS).expect(409);
      rows.set(S_CREATED_ONLY, { ...rows.get(S_CREATED_ONLY)!, createdBy: OTHER });
      const b2 = snapshot();
      await claim(S_CREATED_ONLY).expect(403);
      expect(gateCalls()).toEqual([]);
      expect(rows).toEqual(b2);
      expect(before.get(S_OTHERS)).toEqual(rows.get(S_OTHERS));
    });

    it('re-claiming your own service is a no-op that does not need the gate', async () => {
      await claim(S_DRAFT).expect(201);
      expect(gateCalls()).toEqual([]);
      expect(writes).toEqual([]);
    });
  });

  describe('dual-role context', () => {
    it('the gate decision depends only on the account id - no role, activeRole or userType is read', async () => {
      await request(app.getHttpServer())
        .put(`/v1/services/${S_DRAFT}/publish`)
        .set({ ...as(), 'x-user-role': 'CLIENT' })
        .expect(200);
      expect(gate).toHaveBeenCalledTimes(1);
      expect(gate.mock.calls[0]).toEqual([TALENT]);
    });
  });

  describe('actions that stay available while the gate is closed', () => {
    beforeEach(() => gate.mockResolvedValue(CLOSED('both')));

    it('edit draft, read, archive and delete never ask the gate', async () => {
      await edit(S_DRAFT, { title: 'new title', status: 'draft' }).expect(200);
      await request(app.getHttpServer()).get(`/v1/services/${S_DRAFT}`).expect(200);
      await request(app.getHttpServer()).get('/v1/services').expect(200);
      await request(app.getHttpServer()).put(`/v1/services/${S_DRAFT}/archive`).set(as()).expect(200);
      await request(app.getHttpServer()).delete(`/v1/services/${S_DRAFT}`).set(as()).expect(204);
      expect(gateCalls()).toEqual([]);
    });

    it('unpublish / revert to draft by status write is not gated', async () => {
      await edit(S_PUBLISHED, { status: 'draft' }).expect(200);
      expect(rows.get(S_PUBLISHED)!.status).toBe('draft');
      expect(gateCalls()).toEqual([]);
    });

    it('an already-published service stays published and editing it is not blocked or withdrawn', async () => {
      await edit(S_PUBLISHED, { title: 'edited' }).expect(200);
      await edit(S_PUBLISHED, { status: 'published' }).expect(200); // no transition
      expect(rows.get(S_PUBLISHED)!.status).toBe('published');
      expect(gateCalls()).toEqual([]);
    });
  });
});

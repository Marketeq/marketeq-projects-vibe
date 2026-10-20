import { InternalServerErrorException } from '@nestjs/common'
import 'reflect-metadata';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { RosterGateService } from '../identity-gate/roster-gate.service';
import { InMemoryGateState } from '../identity-gate/testing/in-memory-gate-state.testing';
import { PublishService } from '../publish/publish.service';
import { ListingStatus } from '../shared/enums/listing.enum';
import { viewerIdFromRequest } from '../identity-gate/viewer.decorator';
import * as jwt from 'jsonwebtoken';

// G5: on client-facing project surfaces an owner or member is shown only with a
// KNOWN OPEN gate; a listing whose owner has none is withheld from discovery.
// Real ProjectsService + real RosterGateService over an in-memory last-known gate
// state; Postgres is an in-memory fake keyed on the SQL text.

const OWNER = '20000000-0000-4000-8000-000000000001';
const VERIFIED = '20000000-0000-4000-8000-000000000002';
const GRACE = '20000000-0000-4000-8000-000000000003';
const UNVERIFIED = '20000000-0000-4000-8000-000000000004';
const LAPSED = '20000000-0000-4000-8000-000000000005';
const NEVER_SEEN = '20000000-0000-4000-8000-000000000006';
const INACTIVE_VERIFIED = '20000000-0000-4000-8000-000000000007';
const OTHER = '20000000-0000-4000-8000-000000000009';

// CMS projects author their members as assignee EMAILS on the scope tree.
const ACCOUNT_BY_EMAIL: Record<string, string> = {
  'open@x.test': VERIFIED, // linked account, gate known open
  'closed@x.test': UNVERIFIED, // linked account, gate known closed
  'never@x.test': NEVER_SEEN, // linked account, state never received
  // 'emailonly@x.test': no platform account at all
}
const CMS_SCOPE = () => [
  { phaseName: 'P1', tasks: [
    { title: 'a', roleName: 'Dev', assigneeEmail: 'Open@x.test' },
    { title: 'b', roleName: 'Dev', assigneeEmail: 'closed@x.test' },
  ] },
  { phaseName: 'P2', tasks: [
    { title: 'c', roleName: 'QA', assigneeEmail: 'emailonly@x.test' },
    { title: 'd', roleName: 'QA', assigneeEmail: 'never@x.test' },
    { title: 'e', roleName: 'PM' }, // unassigned task
  ] },
]

const P_MIXED = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const P_HIDDEN_OWNER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
const P_OWNER_ONLY = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3';
const P_OWNERLESS = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4';

describe('G5 - client-facing roster on project listings', () => {
  let service: ProjectsService;
  let state: InMemoryGateState;
  let profileLookups: string[][];
  let emailLookups: string[][];
  let writes: string[];
  let projects: Record<string, any>;

  const mk = (id: string, slug: string, userId: string | null, teamMemberIds: string[], extra: Record<string, any> = {}) => ({
    id, slug, title: slug, status: ListingStatus.Published, listingType: 'project', userId, teamMemberIds,
    skills: ['ts'], tags: [], subcategories: [], mediaUrls: [], featured: false, ...extra,
  });

  const build = () => {
    projects = {
      [P_MIXED]: mk(P_MIXED, 'mixed-1', OWNER, [OWNER, VERIFIED, GRACE, UNVERIFIED, LAPSED, NEVER_SEEN, INACTIVE_VERIFIED]),
      [P_HIDDEN_OWNER]: mk(P_HIDDEN_OWNER, 'hidden-1', UNVERIFIED, [UNVERIFIED, VERIFIED]),
      [P_OWNER_ONLY]: mk(P_OWNER_ONLY, 'owner-1', VERIFIED, [], { scope: CMS_SCOPE() }),
      [P_OWNERLESS]: mk(P_OWNERLESS, 'ownerless-1', null, [VERIFIED, UNVERIFIED], { scope: CMS_SCOPE() }),
    };
    state = new InMemoryGateState().open(OWNER, VERIFIED, GRACE, INACTIVE_VERIFIED).closed(UNVERIFIED, LAPSED); // NEVER_SEEN: none
    profileLookups = [];
    emailLookups = [];
    writes = [];
    const manager = {
      query: jest.fn(async (sql: string, params: any[]) => {
        if (sql.includes('FROM listings.project WHERE id')) {
          const p = projects[params[0]];
          return [{ teamMemberIds: p.teamMemberIds, userId: p.userId }];
        }
        if (sql.includes('FROM listings.project p')) {
          return (params[0] as string[]).map((id) => ({ id, userId: projects[id].userId, teamMemberIds: projects[id].teamMemberIds }));
        }
        if (sql.includes('FROM public.users WHERE lower(email)')) {
          emailLookups.push(params[0]);
          return (params[0] as string[]).filter((e) => ACCOUNT_BY_EMAIL[e]).map((e) => ({ id: ACCOUNT_BY_EMAIL[e], email: e }));
        }
        if (sql.includes('FROM listings.project_members')) return [{ userId: INACTIVE_VERIFIED, status: 'Inactive' }];
        if (sql.includes('FROM user_service.users')) {
          profileLookups.push(params[0]);
          return (params[0] as string[]).map((id) => ({
            id, firstName: `F-${id.slice(-2)}`, lastName: 'L', username: `u-${id.slice(-2)}`, avatarUrl: `https://img/${id}.png`,
            recentJobTitle: 'Dev', location: null, rate: null, rateMin: null, rateMax: null,
          }));
        }
        return [];
      }),
    };
    const repo: any = {
      manager,
      find: jest.fn(async () => Object.values(projects).filter((p) => p.status === ListingStatus.Published)),
      findOne: jest.fn(async ({ where }: any) => Object.values(projects).find((p) => p.id === where.id || p.slug === where.slug) ?? null),
      save: jest.fn(async () => void writes.push('save')),
      update: jest.fn(async () => void writes.push('update')),
      delete: jest.fn(async () => void writes.push('delete')),
    };
    service = new ProjectsService(
      repo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      new RosterGateService(state.asService),
      {} as any,
      { getRateUsdCents: jest.fn().mockResolvedValue(0) } as any,
    );
    jest.spyOn(service as any, 'getProjectHistoryRatings').mockResolvedValue(null);
  };

  beforeEach(build);

  const teamIds = (res: any) => res.team.map((m: any) => m.id);
  const HIDDEN = [UNVERIFIED, LAPSED, NEVER_SEEN];

  describe('detail roster (findBySlug) - public / client viewers', () => {
    it('keeps verified and grace members; omits closed, never-received; honours the existing Inactive filter', async () => {
      const res = await service.findBySlug('mixed-1', null);
      expect(teamIds(res)).toEqual([OWNER, VERIFIED, GRACE]);
      expect(res.isTemporarilyUnavailable).toBe(false);
    });

    it('a member with no known state is omitted without blanking the known-visible ones', async () => {
      const res = await service.findBySlug('mixed-1', null);
      expect(teamIds(res)).not.toContain(NEVER_SEEN);
      expect(teamIds(res).length).toBeGreaterThan(0);
    });

    it('a hidden member\'s profile is never loaded, and nothing about them survives in the response', async () => {
      const res = await service.findBySlug('mixed-1', null);
      for (const id of HIDDEN) {
        expect(profileLookups.flat()).not.toContain(id);
        expect(JSON.stringify(res)).not.toContain(id);
      }
      expect(JSON.stringify(res)).not.toMatch(/notShownToClients|Not shown to clients/);
    });

    it('a hidden owner\'s id is not disclosed through ownerId; the listing stays available', async () => {
      const res = await service.findBySlug('hidden-1', null);
      expect(res.ownerId).toBeNull();
      expect(teamIds(res)).toEqual([VERIFIED]);
    });

    it('a roster that is entirely hidden becomes the existing temporarily-unavailable state, not an error', async () => {
      state.closed(VERIFIED);
      const res = await service.findBySlug('hidden-1', null);
      expect(res.team).toEqual([]);
      expect(res.isTemporarilyUnavailable).toBe(true);
    });

    it('an owner-only listing shows its known-open owner', async () => {
      expect(teamIds(await service.findBySlug('owner-1', null))).toEqual([VERIFIED]);
    });

    it('a signed-in client who is not the owner gets exactly the public view', async () => {
      const pub = await service.findBySlug('mixed-1', null);
      const other = await service.findBySlug('mixed-1', OTHER);
      expect(teamIds(other)).toEqual(teamIds(pub));
      expect((other as any).notShownToClients).toBeUndefined();
    });
  });

  describe('owner / internal view', () => {
    it('the project owner sees every active member, with only the neutral "Not shown to clients" marker', async () => {
      const res: any = await service.findBySlug('mixed-1', OWNER);
      expect(teamIds(res).sort()).toEqual([OWNER, VERIFIED, GRACE, UNVERIFIED, LAPSED, NEVER_SEEN].sort());
      expect(res.notShownToClients.map((n: any) => n.userId).sort()).toEqual([...HIDDEN].sort());
      expect(res.notShownToClients.every((n: any) => n.label === 'Not shown to clients')).toBe(true);
      expect(JSON.stringify(res.notShownToClients)).not.toMatch(/verif|identity|location|grace|expired|closed|gate/i);
      expect(res.ownerId).toBe(OWNER);
    });

    it('a hidden OWNER still sees their own listing in full', async () => {
      const res: any = await service.findBySlug('hidden-1', UNVERIFIED);
      expect(teamIds(res)).toEqual(expect.arrayContaining([UNVERIFIED, VERIFIED]));
      expect(res.ownerId).toBe(UNVERIFIED);
    });

    it('PublishService (owner drafts, members, my-listings) does not depend on the roster gate', () => {
      const params: unknown[] = Reflect.getMetadata('design:paramtypes', PublishService) ?? [];
      expect(params).not.toContain(RosterGateService);
    });
  });

  describe('the viewer comes from authentication only', () => {
    it('the controller passes the verified token\'s subject and nothing from the query', () => {
      const params = Reflect.getMetadata('__routeArguments__', ProjectsController, 'findBySlug');
      // @Param('slug') and @ViewerId(): no @Query / @Body argument is declared for the viewer.
      const kinds = Object.keys(params).map((k) => Number(k.split(':')[0]));
      expect(kinds).not.toContain(4); // RouteParamtypes.QUERY
      expect(kinds).not.toContain(3); // RouteParamtypes.BODY
    });

    it('viewerIdFromRequest trusts only a valid bearer token', () => {
      process.env.JWT_SECRET = 'test-secret';
      delete process.env.AUTH_JWT_PUBLIC_KEY;
      const good = jwt.sign({ sub: OWNER }, 'test-secret');
      expect(viewerIdFromRequest({ headers: { authorization: `Bearer ${good}` } })).toBe(OWNER);
      expect(viewerIdFromRequest({ headers: { authorization: `Bearer ${jwt.sign({ sub: OWNER }, 'other')}` } })).toBeNull();
      expect(viewerIdFromRequest({ headers: { authorization: 'Bearer junk' } })).toBeNull();
      expect(viewerIdFromRequest({ headers: { 'x-user-id': OWNER } })).toBeNull();
      expect(viewerIdFromRequest({ headers: {} })).toBeNull();
    });
  });

  describe('marketplace discovery (findAll, similar, recommended)', () => {
    it('withholds a listing whose owner has a closed gate or no known state; keeps ownerless listings', async () => {
      const slugs = (await service.findAll()).map((p: any) => p.slug).sort();
      expect(slugs).toEqual(['mixed-1', 'owner-1', 'ownerless-1']);
      state.rows.delete(OWNER);
      expect((await service.findAll()).map((p: any) => p.slug).sort()).toEqual(['owner-1', 'ownerless-1']);
    });

    it('the listing returns automatically when its owner\'s gate opens and goes again when it closes - stored status unchanged', async () => {
      const before = JSON.stringify(projects);
      expect((await service.findAll()).map((p: any) => p.slug)).not.toContain('hidden-1');
      await state.apply(UNVERIFIED, true, new Date(Date.now() + 1000));
      expect((await service.findAll()).map((p: any) => p.slug)).toContain('hidden-1');
      await state.apply(UNVERIFIED, false, new Date(Date.now() + 2000));
      expect((await service.findAll()).map((p: any) => p.slug)).not.toContain('hidden-1');
      expect(projects[P_HIDDEN_OWNER].status).toBe(ListingStatus.Published);
      expect(JSON.stringify(projects)).toBe(before);
      expect(writes).toEqual([]);
    });

    it('avatars and members omit members without an open gate', async () => {
      const mixed: any = (await service.findAll()).find((p: any) => p.id === P_MIXED);
      expect(mixed.teamMembers.map((m: any) => m.username)).toEqual(['u-01', 'u-02', 'u-03', 'u-07']);
      expect(JSON.stringify(mixed.teamAvatars)).not.toContain(UNVERIFIED);
      expect(JSON.stringify(mixed.teamAvatars)).not.toContain(LAPSED);
    });

    it('similar projects never suggest a listing whose owner is hidden', async () => {
      const similar: any[] = await service.getSimilarById(P_OWNER_ONLY);
      expect(similar.map((s) => s.slug)).not.toContain('hidden-1');
      expect(similar.map((s) => s.slug)).toEqual(expect.arrayContaining(['mixed-1']));
    });

    it('recommended-by-skills withholds hidden owners and counts only visible members', async () => {
      const rec: any[] = await service.getRecommendedBySkills(['ts'], 10);
      expect(rec.map((r) => r.slug)).not.toContain('hidden-1');
      const mixed = rec.find((r) => r.slug === 'mixed-1');
      expect(mixed.memberCount).toBe(4); // OWNER, VERIFIED, GRACE, INACTIVE_VERIFIED (the status filter is a separate, existing rule)
      expect(JSON.stringify(mixed.memberAvatars)).not.toContain(UNVERIFIED);
    });

    it('recommended-by-nothing still fills from the visible listings', async () => {
      const rec: any[] = await service.getRecommendedBySkills([], 2);
      expect(rec.length).toBe(2);
      expect(rec.map((r) => r.slug)).not.toContain('hidden-1');
    });
  });

  describe('CMS project members (assignee emails on the scope) - the active, registered path', () => {
    const emails = (res: any) =>
      (res.scope ?? []).flatMap((p: any) => (p.tasks ?? []).map((t: any) => t.assigneeEmail)).filter(Boolean)
    const taskTitles = (res: any) => (res.scope ?? []).flatMap((p: any) => (p.tasks ?? []).map((t: any) => t.title))

    it('detail: only the assignee whose linked account has a known open gate keeps their email', async () => {
      const res: any = await service.findBySlug('ownerless-1', null)
      expect(emails(res)).toEqual(['Open@x.test'])
    })

    it('email-only, closed-gate and never-received assignees are removed; the tasks themselves remain', async () => {
      const res: any = await service.findBySlug('ownerless-1', null)
      const raw = JSON.stringify(res.scope);
      for (const hidden of ['closed@x.test', 'emailonly@x.test', 'never@x.test']) expect(raw).not.toContain(hidden)
      expect(taskTitles(res)).toEqual(['a', 'b', 'c', 'd', 'e'])
    })

    it('the same rule on the list and on GET :id', async () => {
      const list: any[] = await service.findAll()
      expect(emails(list.find((p) => p.slug === 'ownerless-1'))).toEqual(['Open@x.test'])
      const one: any = await service.findOnePublished(P_OWNERLESS)
      expect(emails(one)).toEqual(['Open@x.test'])
    })

    it('a closed account\'s assignee returns when their gate opens; the stored scope is never changed', async () => {
      const before = JSON.stringify(projects[P_OWNERLESS].scope)
      expect(emails(await service.findBySlug('ownerless-1', null))).toEqual(['Open@x.test'])
      await state.apply(UNVERIFIED, true, new Date(Date.now() + 1000))
      expect(emails(await service.findBySlug('ownerless-1', null)).sort()).toEqual(['Open@x.test', 'closed@x.test'].sort())
      await state.apply(UNVERIFIED, false, new Date(Date.now() + 2000))
      expect(emails(await service.findBySlug('ownerless-1', null))).toEqual(['Open@x.test'])
      expect(JSON.stringify(projects[P_OWNERLESS].scope)).toBe(before)
      expect(writes).toEqual([])
    })

    it('the listing\'s owner (authenticated) still sees every assignee', async () => {
      const res: any = await service.findBySlug('owner-1', VERIFIED)
      expect(emails(res).sort()).toEqual(['Open@x.test', 'closed@x.test', 'emailonly@x.test', 'never@x.test'].sort())
      const byId: any = await service.findOnePublished(P_OWNER_ONLY, VERIFIED)
      expect(emails(byId)).toHaveLength(4)
    })

    it('another signed-in user gets exactly the public view', async () => {
      const res: any = await service.findBySlug('owner-1', OTHER)
      expect(emails(res)).toEqual(['Open@x.test'])
    })

    it('resolves emails to accounts with one local lookup per response, and a state lookup that is not per assignee', async () => {
      emailLookups.length = 0
      await service.findBySlug('ownerless-1', null)
      expect(emailLookups).toHaveLength(1)
      expect(emailLookups[0].sort()).toEqual(['closed@x.test', 'emailonly@x.test', 'never@x.test', 'open@x.test'])
    })

    it('an unreadable account lookup shows nobody (never everybody)', async () => {
      ;(service as any).repo.manager.query.mockImplementationOnce(async () => { throw new InternalServerErrorException('boom') })
      const res: any = await service.findOnePublished(P_OWNERLESS)
      expect(emails(res)).toEqual([])
    })

    it('listings with no assignees cost no account lookup', async () => {
      emailLookups.length = 0
      await service.findBySlug('mixed-1', null)
      expect(emailLookups).toHaveLength(0)
    })
  })

  describe('availability: last-known state, no synchronous identity calls', () => {
    it('a response costs a bounded number of local lookups, whatever the roster size', async () => {
      state.reads = 0;
      await service.findAll();
      expect(state.reads).toBeLessThanOrEqual(3); // the page, similar rail, avatars
      state.reads = 0;
      await service.findBySlug('mixed-1', null);
      expect(state.reads).toBeLessThanOrEqual(4);
    });

    it('an unreadable state table omits everyone but every page still resolves', async () => {
      state.readFails = true;
      const res = await service.findBySlug('mixed-1', null);
      expect(res.team).toEqual([]);
      const out = await service.findAll();
      expect(out.map((p: any) => p.slug)).toEqual(['ownerless-1']);
    });
  });
});

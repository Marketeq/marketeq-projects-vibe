import 'reflect-metadata';
import { RecentlyViewedService } from './recently-viewed.service';
import { RosterGateService } from '../identity-gate/roster-gate.service';
import { InMemoryGateState } from '../identity-gate/testing/in-memory-gate-state.testing';
import { ListingStatus } from '../shared/enums/listing.enum';

// G5: the viewer's recently-viewed and recommended rails are client-facing
// discovery: a listing whose owner has no known open gate is withheld and rosters
// show only known-open members. Display only.

const OPEN_OWNER = '60000000-0000-4000-8000-000000000001';
const CLOSED_OWNER = '60000000-0000-4000-8000-000000000002';
const NEVER_SEEN = '60000000-0000-4000-8000-000000000003';
const MEMBER_OPEN = '60000000-0000-4000-8000-000000000004';
const MEMBER_CLOSED = '60000000-0000-4000-8000-000000000005';
const VIEWER = '60000000-0000-4000-8000-000000000009';

const proj = (id: string, owner: string | null, members: string[] = [], extra: any = {}) => ({
  id, slug: id, title: id, status: ListingStatus.Published, userId: owner, teamMemberIds: members,
  mediaUrls: [], skills: [], tags: [], programmingLanguages: [], developmentTech: [], subcategories: [], featured: false, rating: 0, ...extra,
});

describe('G5 - recently viewed / recommended rails', () => {
  const P = {
    open: proj('p-open', OPEN_OWNER, [OPEN_OWNER, MEMBER_OPEN, MEMBER_CLOSED]),
    closed: proj('p-closed', CLOSED_OWNER, [CLOSED_OWNER]),
    unknown: proj('p-unknown', NEVER_SEEN, [NEVER_SEEN]),
    ownerless: proj('p-ownerless', null, []),
  };
  const build = (readFails = false) => {
    const state = new InMemoryGateState().open(OPEN_OWNER, MEMBER_OPEN).closed(CLOSED_OWNER, MEMBER_CLOSED);
    state.readFails = readFails;
    const all = Object.values(P);
    const writes: string[] = [];
    const views = all.map((p, i) => ({ userId: VIEWER, projectId: p.id, viewedAt: new Date(1_790_000_000_000 - i) }));
    const viewsRepo: any = { find: jest.fn(async () => views), upsert: jest.fn(async () => void writes.push('upsert')) };
    const qb: any = { where: () => qb, andWhere: () => qb, getMany: async () => all };
    const projectRepo: any = {
      createQueryBuilder: () => qb,
      find: jest.fn(async () => all),
      manager: {
        query: jest.fn(async (sql: string, params: any[]) =>
          sql.includes('user_service.users') ? (params[0] as string[]).map((id) => ({ id, avatarUrl: `https://img/${id}.png` })) : []),
      },
    };
    const svc = new RecentlyViewedService(viewsRepo, projectRepo, new RosterGateService(state.asService));
    return { svc, state, writes, projectRepo };
  };

  it('recently viewed: a listing whose owner is closed or never received is withheld; ownerless and open ones stay', async () => {
    const { svc } = build();
    const out: any[] = await svc.getRecentlyViewed(VIEWER);
    expect(out.map((p) => p.slug).sort()).toEqual(['p-open', 'p-ownerless']);
  });

  it('recommended with no history (popular): withholds the same listings', async () => {
    const { svc, projectRepo } = build();
    jest.spyOn((svc as any).repo, 'find').mockResolvedValue([]);
    const out: any[] = await svc.getRecommended(VIEWER);
    expect(projectRepo.find).toBeDefined();
    expect(out.map((p) => p.slug)).not.toContain('p-closed');
    expect(out.map((p) => p.slug)).not.toContain('p-unknown');
  });

  it('recommended with history: candidates are filtered and avatars omit closed members', async () => {
    const { svc } = build();
    const out: any[] = await svc.getRecommended(VIEWER);
    const slugs = out.map((p) => p.slug);
    expect(slugs).not.toContain('p-closed');
    expect(slugs).not.toContain('p-unknown');
    const open = out.find((p) => p.slug === 'p-open');
    if (open) {
      expect(JSON.stringify(open.teamAvatars)).not.toContain(MEMBER_CLOSED);
    }
  });

  it('the listing returns as soon as its owner opens, and nothing is written', async () => {
    const { svc, state, writes } = build();
    expect((await svc.getRecentlyViewed(VIEWER)).map((p: any) => p.slug)).not.toContain('p-closed');
    await state.apply(CLOSED_OWNER, true, new Date(Date.now() + 1000));
    expect((await svc.getRecentlyViewed(VIEWER)).map((p: any) => p.slug)).toContain('p-closed');
    expect(writes).toEqual([]);
    expect(P.closed.status).toBe(ListingStatus.Published);
  });

  it('an unreadable state table withholds owned listings but the rail still resolves', async () => {
    const { svc } = build(true);
    expect((await svc.getRecentlyViewed(VIEWER)).map((p: any) => p.slug)).toEqual(['p-ownerless']);
  });
});

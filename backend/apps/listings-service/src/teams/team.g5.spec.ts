import 'reflect-metadata';
import { TeamsService } from './team.service';
import { RosterGateService } from '../identity-gate/roster-gate.service';
import { InMemoryGateState } from '../identity-gate/testing/in-memory-gate-state.testing';
import { ListingStatus } from '../shared/enums/listing.enum';

// G5: the PUBLIC team list (marketplace and the homepage tiles built from it) and
// the public team detail. Owner/management (findMine, the owner's own detail,
// the internal findById RPC) are unaffected.

const OWNER_OPEN = '70000000-0000-4000-8000-000000000001';
const OWNER_CLOSED = '70000000-0000-4000-8000-000000000002';
const M_OPEN = '70000000-0000-4000-8000-000000000003';
const M_CLOSED = '70000000-0000-4000-8000-000000000004';
const M_UNKNOWN = '70000000-0000-4000-8000-000000000005';

const team = (id: string, createdBy: string | null, memberIds: string[]) => ({
  id, title: id, slug: id, status: ListingStatus.Published, createdBy, memberIds, skills: [], tags: [], industry: [], createdAt: new Date(),
});

describe('G5 - teams', () => {
  const build = () => {
    const state = new InMemoryGateState().open(OWNER_OPEN, M_OPEN).closed(OWNER_CLOSED, M_CLOSED);
    const teams: any[] = [
      team('t-open', OWNER_OPEN, [M_OPEN, M_CLOSED, M_UNKNOWN]),
      team('t-closed-owner', OWNER_CLOSED, [M_OPEN]),
      team('t-system', 'cms-seed', [M_OPEN]),
      team('t-no-owner', null, []),
    ];
    const writes: string[] = [];
    const repo: any = {
      find: jest.fn(async () => teams),
      findOne: jest.fn(async ({ where }: any) => teams.find((t) => t.id === where.id) ?? null),
      save: jest.fn(async () => void writes.push('save')),
      update: jest.fn(async () => void writes.push('update')),
    };
    const svc = new TeamsService(repo, { emit: jest.fn() } as any, new RosterGateService(state.asService));
    return { svc, state, teams, writes };
  };

  it('the public list withholds a team whose owner has no known open gate; system-owned and ownerless teams are not subject to it', async () => {
    const { svc } = build();
    expect((await svc.findAll()).map((t: any) => t.id).sort()).toEqual(['t-no-owner', 't-open', 't-system']);
  });

  it('members without a known open gate are left out of memberIds (closed and never-received alike)', async () => {
    const { svc } = build();
    const open: any = (await svc.findAll()).find((t: any) => t.id === 't-open');
    expect(open.memberIds).toEqual([M_OPEN]);
  });

  it('a team returns by itself when its owner\'s gate opens; nothing is written; stored status unchanged', async () => {
    const { svc, state, teams, writes } = build();
    const before = JSON.stringify(teams);
    expect((await svc.findAll()).map((t: any) => t.id)).not.toContain('t-closed-owner');
    await state.apply(OWNER_CLOSED, true, new Date(Date.now() + 1000));
    expect((await svc.findAll()).map((t: any) => t.id)).toContain('t-closed-owner');
    expect(JSON.stringify(teams)).toBe(before);
    expect(writes).toEqual([]);
  });

  it('public detail filters members; the owner\'s own detail does not', async () => {
    const { svc } = build();
    expect(((await svc.findOneForViewer('t-open', null)) as any).memberIds).toEqual([M_OPEN]);
    expect(((await svc.findOneForViewer('t-open', OWNER_CLOSED)) as any).memberIds).toEqual([M_OPEN]); // another signed-in user: filtered
    expect(((await svc.findOneForViewer('t-open', OWNER_OPEN)) as any).memberIds).toEqual([M_OPEN, M_CLOSED, M_UNKNOWN]); // the owner: complete
  });

  it('the management view (findMine) and the raw findOne are not filtered', async () => {
    const { svc } = build();
    expect((await svc.findOne('t-open')).memberIds).toEqual([M_OPEN, M_CLOSED, M_UNKNOWN]);
  });
});

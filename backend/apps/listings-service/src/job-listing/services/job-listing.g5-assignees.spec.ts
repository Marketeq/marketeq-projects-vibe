import 'reflect-metadata';
import { JobListingService } from './job-listing.service';
import { RosterGateService } from '../../identity-gate/roster-gate.service';
import { InMemoryGateState } from '../../identity-gate/testing/in-memory-gate-state.testing';

// G5: job-role assignees follow exactly the same rule as every other roster. The
// listing's owner (the client who created it) sees every role and assignee; any
// other viewer sees an assignee only when their linked account has a known open
// gate. A role whose assignee is not shown appears as an open (unassigned) role.
// The stored role rows are never changed.

const CLIENT = '90000000-0000-4000-8000-000000000001'; // the listing's owner
const A_OPEN = '90000000-0000-4000-8000-000000000002';
const A_CLOSED = '90000000-0000-4000-8000-000000000003';
const A_NEVER = '90000000-0000-4000-8000-000000000004';
const SOMEONE = '90000000-0000-4000-8000-000000000009';
const LISTING = 'bbbbbbbb-0000-4000-8000-000000000001';

describe('G5 - job-listing role assignees', () => {
  const rows = () => [
    { id: 'r1', assignedUserId: A_OPEN, assignedUsername: 'open', assignedUserDeactivated: false, rate: 50 },
    { id: 'r2', assignedUserId: A_CLOSED, assignedUsername: 'closed', assignedUserDeactivated: false, rate: 60 },
    { id: 'r3', assignedUserId: A_NEVER, assignedUsername: 'never', assignedUserDeactivated: false, rate: 70 },
    { id: 'r4', assignedUserId: null, assignedUsername: null, assignedUserDeactivated: false, rate: 80 }, // unassigned role
  ];

  const build = () => {
    const state = new InMemoryGateState().open(A_OPEN).closed(A_CLOSED);
    const listing: any = { id: LISTING, clientUserId: CLIENT, contractType: 'new', teamMemberRows: rows() };
    const writes: string[] = [];
    const repo: any = { findOne: jest.fn(async () => listing), save: jest.fn(async () => void writes.push('save')) };
    const roleRowRepo: any = { save: jest.fn(async () => void writes.push('save')) };
    const userProfileClient = {
      hydrateTeam: jest.fn(async (ids: string[]) => ids.map((userId) => ({ userId, username: `u-${userId.slice(-2)}`, avatarUrl: null }))),
    };
    const svc = new JobListingService(
      repo, roleRowRepo, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      userProfileClient as any, new RosterGateService(state.asService),
    );
    jest.spyOn(svc as any, 'attachInheritedScope').mockImplementation(async (l: any) => l);
    return { svc, state, listing, writes, userProfileClient };
  };

  const assignees = (l: any) => l.teamMemberRows.map((r: any) => r.assignedUserId);

  it('the owner sees every role and every assignee', async () => {
    const { svc } = build();
    const out: any = await svc.findOne(CLIENT, LISTING);
    expect(assignees(out)).toEqual([A_OPEN, A_CLOSED, A_NEVER, null]);
  });

  it('any other viewer sees only known-open assignees; the rest appear as unassigned roles, with every identifying field cleared', async () => {
    const { svc } = build();
    const out: any = await svc.findOne(SOMEONE, LISTING);
    expect(assignees(out)).toEqual([A_OPEN, null, null, null]);
    const hiddenRows = out.teamMemberRows.filter((r: any) => ['r2', 'r3'].includes(r.id));
    for (const r of hiddenRows) {
      expect(r.assignedUsername).toBeNull();
      expect(r.assignedMember).toBeNull();
      expect(r.assignedUserDeactivated).toBe(false);
    }
    const raw = JSON.stringify(out);
    for (const id of [A_CLOSED, A_NEVER]) expect(raw).not.toContain(id);
    expect(raw).not.toMatch(/closed|never/);
  });

  it('the roles themselves remain (only the person is not shown), and the shown assignee is hydrated', async () => {
    const { svc } = build();
    const out: any = await svc.findOne(SOMEONE, LISTING);
    expect(out.teamMemberRows.map((r: any) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4']);
    expect(out.teamMemberRows[0].assignedMember.userId).toBe(A_OPEN);
  });

  it('the same state gives the same answer as every other roster: a closed assignee returns when their gate opens', async () => {
    const { svc, state } = build();
    expect(assignees(await svc.findOne(SOMEONE, LISTING))).toEqual([A_OPEN, null, null, null]);
    await state.apply(A_CLOSED, true, new Date(Date.now() + 1000));
    expect(assignees(await svc.findOne(SOMEONE, LISTING))).toEqual([A_OPEN, A_CLOSED, null, null]);
  });

  it('a non-owner view writes nothing and leaves every stored assignment and rate as it was', async () => {
    const { svc, listing, writes } = build();
    await svc.findOne(SOMEONE, LISTING);
    expect(writes).toEqual([]);
    // The row objects the repository holds keep their assignment and rate; only
    // the viewer's COPY of a hidden role is cleared.
    expect(listing.teamMemberRows.map((r: any) => [r.id, r.assignedUserId, r.rate])).toEqual([
      ['r1', A_OPEN, 50], ['r2', A_CLOSED, 60], ['r3', A_NEVER, 70], ['r4', null, 80],
    ]);
  });

  it('an unreadable gate-state table shows no assignees to non-owners but never blanks the owner view', async () => {
    const { svc, state } = build();
    state.readFails = true;
    expect(assignees(await svc.findOne(SOMEONE, LISTING))).toEqual([null, null, null, null]);
    expect(assignees(await svc.findOne(CLIENT, LISTING))).toEqual([A_OPEN, A_CLOSED, A_NEVER, null]);
  });
});

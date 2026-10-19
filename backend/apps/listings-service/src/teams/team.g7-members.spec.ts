import 'reflect-metadata';
import { of, throwError } from 'rxjs';
import { TeamsService } from './team.service';
import { RosterGateService } from '../identity-gate/roster-gate.service';
import { InMemoryGateState } from '../identity-gate/testing/in-memory-gate-state.testing';
import { CLOSED, OPEN, makeMemberGate } from '../identity-gate/testing/member-gate.testing';
import { IdentityVerificationUnavailableException } from '../identity-gate/identity-gate.exceptions';

// G7: members added to a TEAM (the listings team profile, `memberIds`) by the direct
// create / update routes must pass the verification gate, like accepting an invitation.
const OWNER = '20000000-0000-4000-8000-0000000000f0';
const V = '20000000-0000-4000-8000-00000000000a'; // verified
const G = '20000000-0000-4000-8000-00000000000b'; // grace
const U = '20000000-0000-4000-8000-00000000000c'; // unverified
const X = '20000000-0000-4000-8000-00000000000d'; // expired
const OLD = '20000000-0000-4000-8000-00000000000e'; // already on the team, since closed

describe('G7 - team member-add (v1/teams create, update, my-teams)', () => {
  const build = (identity = { [OWNER]: OPEN, [V]: OPEN, [G]: OPEN, [U]: CLOSED('both'), [X]: CLOSED('identity'), [OLD]: CLOSED('both') }, gateOpts: any = {}) => {
    const { gate, transport, asked } = makeMemberGate(identity as any, gateOpts);
    const store = new Map<string, any>([['t1', { id: 't1', title: 't', slug: 't', status: 'published', createdBy: OWNER, memberIds: [OLD], createdAt: new Date() }]]);
    const writes: string[] = [];
    const repo: any = {
      create: jest.fn((d: any) => ({ id: 'new', createdAt: new Date(), ...d })),
      save: jest.fn(async (e: any) => (writes.push('save'), store.set(e.id, e), e)),
      update: jest.fn(async (id: string, d: any) => (writes.push('update'), store.set(id, { ...store.get(id), ...d }))),
      findOne: jest.fn(async ({ where }: any) => store.get(where.id) ?? null),
    };
    const emit = jest.fn(() => of(undefined));
    const svc = new TeamsService(repo, { emit } as any, new RosterGateService(new InMemoryGateState().asService), gate);
    return { svc, store, writes, transport, asked, emit };
  };

  it('create: verified and grace members are added; blocked ones are reported and left out; the request succeeds', async () => {
    const { svc, store } = build();
    const out: any = await svc.create({ title: 'New', description: '', memberIds: [V, U, G, X] } as any, OWNER);
    expect(store.get('new').memberIds).toEqual([V, G]);
    expect(out.memberResults.map((r: any) => [r.index, r.status])).toEqual([[0, 'added'], [1, 'blocked_verification'], [2, 'added'], [3, 'blocked_verification']]);
    expect(out.memberResults[1]).toMatchObject({ error: 'VERIFICATION_REQUIRED', added: false });
  });

  it('create: the creator\'s own membership is bootstrap - not gated, and not checked even when they are unverified', async () => {
    const { svc, store, asked } = build({ [OWNER]: CLOSED('both'), [V]: OPEN } as any);
    await svc.create({ title: 'New', description: '', memberIds: [OWNER, V] } as any, OWNER);
    expect(store.get('new').memberIds).toEqual([OWNER, V]);
    expect(asked()).toEqual([V]);
  });

  it('create: the owner doing the adding is never evaluated', async () => {
    const { svc, asked } = build({ [OWNER]: CLOSED('both'), [V]: OPEN } as any);
    await svc.create({ title: 'New', description: '', memberIds: [V] } as any, OWNER);
    expect(asked()).toEqual([V]);
  });

  it('update: only NEW members are evaluated; an existing member whose gate has since closed stays (nothing is removed)', async () => {
    const { svc, store, asked } = build();
    const out: any = await svc.update('t1', { memberIds: [OLD, V, U] } as any);
    expect(store.get('t1').memberIds).toEqual([OLD, V]);
    expect(asked().sort()).toEqual([V, U].sort());
    expect(out.memberResults.map((r: any) => r.status)).toEqual(['already_member', 'added', 'blocked_verification']);
  });

  it('update: one blocked member does not roll back the eligible ones', async () => {
    const { svc, store } = build();
    await svc.update('t1', { memberIds: [OLD, U, V, G] } as any);
    expect(store.get('t1').memberIds).toEqual([OLD, V, G]);
  });

  it('update: invalid and duplicate entries stay distinguishable from verification failures', async () => {
    const { svc } = build();
    const out: any = await svc.update('t1', { memberIds: [OLD, V, V, 'garbage', U] } as any);
    expect(out.memberResults.map((r: any) => [r.status, r.error ?? null])).toEqual([
      ['already_member', null], ['added', null], ['duplicate', 'DUPLICATE_MEMBER'], ['invalid', 'INVALID_MEMBER'], ['blocked_verification', 'VERIFICATION_REQUIRED'],
    ]);
  });

  it('a request-supplied verification value cannot bypass the gate', async () => {
    const { svc, store } = build();
    await svc.update('t1', { memberIds: [OLD, U], gateOpen: true, verified: true } as any);
    expect(store.get('t1').memberIds).toEqual([OLD]);
  });

  it('a blocked add creates no membership and publishes no event for the blocked person', async () => {
    const { svc, store, emit } = build();
    await svc.update('t1', { memberIds: [OLD, U] } as any);
    expect(store.get('t1').memberIds).toEqual([OLD]);
    const payloads = JSON.stringify((emit.mock.calls as unknown as any[][]).map((c) => c[1]));
    expect(payloads).not.toContain(U);
  });

  it('one batch gate request covers the whole request, however many members', async () => {
    const { svc, transport } = build();
    await svc.update('t1', { memberIds: [OLD, V, G, U, X] } as any);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('gate failure follows the invitation-acceptance rule: the request fails (503) and nothing is written', async () => {
    const { svc, store, writes } = build(undefined, { impl: () => throwError(() => new Error('down')) });
    await expect(svc.update('t1', { memberIds: [OLD, V] } as any)).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
    await expect(svc.create({ title: 'N', description: '', memberIds: [V] } as any, OWNER)).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
    expect(writes).toEqual([]);
    expect(store.get('t1').memberIds).toEqual([OLD]);
  });

  it('a team update that does not touch memberIds is not gated at all', async () => {
    const { svc, transport } = build();
    await svc.update('t1', { title: 'renamed' } as any);
    expect(transport).not.toHaveBeenCalled();
  });

  it('an unknown team is still a 404 (no gate request)', async () => {
    const { svc, transport } = build();
    await expect(svc.update('nope', { memberIds: [V] } as any)).rejects.toThrow('Team not found');
    expect(transport).not.toHaveBeenCalled();
  });
});

import 'reflect-metadata';
import { throwError } from 'rxjs';
import { ProjectsService } from './projects.service';
import { RosterGateService } from '../identity-gate/roster-gate.service';
import { InMemoryGateState } from '../identity-gate/testing/in-memory-gate-state.testing';
import { CLOSED, OPEN, makeMemberGate } from '../identity-gate/testing/member-gate.testing';
import { IdentityVerificationUnavailableException } from '../identity-gate/identity-gate.exceptions';

// G7: `teamMemberIds` on the direct project create / update routes.
const OWNER = '40000000-0000-4000-8000-0000000000f0';
const V = '40000000-0000-4000-8000-00000000000a';
const U = '40000000-0000-4000-8000-00000000000c';
const OLD = '40000000-0000-4000-8000-00000000000e';
const ID = 'dddddddd-0000-4000-8000-000000000001';

describe('G7 - project create/update teamMemberIds', () => {
  const build = (gateOpts: any = {}) => {
    const { gate, transport, asked } = makeMemberGate({ [OWNER]: OPEN, [V]: OPEN, [U]: CLOSED('both'), [OLD]: CLOSED('both') } as any, gateOpts);
    const stored: any = { id: ID, listingType: 'project', userId: OWNER, createdBy: OWNER, teamMemberIds: [OLD], title: 't', description: 'd', status: 'draft' };
    const writes: string[] = [];
    const repo: any = {
      findOne: jest.fn(async () => ({ ...stored })),
      create: jest.fn((d: any) => ({ id: ID, ...d })),
      save: jest.fn(async (e: any) => (writes.push('save'), Object.assign(stored, e), e)),
      update: jest.fn(async (_id: string, d: any) => (writes.push('update'), Object.assign(stored, d))),
      manager: { query: jest.fn(async () => []) },
      createQueryBuilder: jest.fn(),
    };
    const svc = new ProjectsService(repo, {} as any, {} as any, {} as any, {} as any, new RosterGateService(new InMemoryGateState().asService), gate, {} as any);
    jest.spyOn(svc as any, 'resolveUniqueSlug').mockResolvedValue('slug');
    jest.spyOn(svc as any, 'emitAlgoliaUpsert').mockImplementation(() => undefined);
    return { svc, stored, writes, transport, asked };
  };

  it('update: eligible additions are saved, blocked ones are not, per-entry results come back, and the owner is not checked', async () => {
    const { svc, stored, asked } = build();
    const out: any = await svc.update(ID, { teamMemberIds: [OLD, V, U] } as any, OWNER);
    expect(stored.teamMemberIds).toEqual([OLD, V]);
    expect(out.memberResults.map((r: any) => r.status)).toEqual(['already_member', 'added', 'blocked_verification']);
    expect(asked().sort()).toEqual([V, U].sort());
    expect(asked()).not.toContain(OWNER);
  });

  it('create: the creator is bootstrap (not gated); others are', async () => {
    const { svc, stored, asked } = build();
    const out: any = await svc.create({ title: 'T', description: 'D', teamMemberIds: [OWNER, V, U] } as any, OWNER);
    expect(stored.teamMemberIds).toEqual([OWNER, V]);
    expect(out.memberResults.map((r: any) => r.status)).toEqual(['added', 'added', 'blocked_verification']);
    expect(asked()).not.toContain(OWNER);
  });

  it('gate failure fails the request (503) before anything is written', async () => {
    const { svc, writes } = build({ impl: () => throwError(() => new Error('down')) });
    await expect(svc.update(ID, { teamMemberIds: [OLD, V] } as any, OWNER)).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
    await expect(svc.create({ title: 'T', description: 'D', teamMemberIds: [V] } as any, OWNER)).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
    expect(writes).toEqual([]);
  });

  it('an update without teamMemberIds makes no gate request', async () => {
    const { svc, transport } = build();
    await svc.update(ID, { title: 'new title' } as any, OWNER);
    expect(transport).not.toHaveBeenCalled();
  });

  it('authorization is unchanged and decided before the gate: a non-owner is refused with no gate request', async () => {
    const { svc, transport } = build();
    await expect(svc.update(ID, { teamMemberIds: [V] } as any, '99999999-0000-4000-8000-000000000000')).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });
});

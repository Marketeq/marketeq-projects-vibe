import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { throwError } from 'rxjs';
import { PublishService } from './publish.service';
import { CLOSED, OPEN, makeMemberGate } from '../identity-gate/testing/member-gate.testing';
import { IdentityVerificationUnavailableException } from '../identity-gate/identity-gate.exceptions';

// G7: the listing wizard's team step. `PUT /publish/project/:id/members` is a bulk
// direct-add (and `teamMemberIds` on the draft update is the same roster). People
// added must pass the verification gate, like accepting an invitation.
const OWNER = '30000000-0000-4000-8000-0000000000f0';
const V = '30000000-0000-4000-8000-00000000000a';
const G = '30000000-0000-4000-8000-00000000000b';
const U = '30000000-0000-4000-8000-00000000000c';
const X = '30000000-0000-4000-8000-00000000000d';
const OLD = '30000000-0000-4000-8000-00000000000e'; // existing member, gate since closed
const IDENTITY = { [OWNER]: OPEN, [V]: OPEN, [G]: OPEN, [U]: CLOSED('both'), [X]: CLOSED('identity'), [OLD]: CLOSED('both') };
const PROJECT = 'bbbbbbbb-0000-4000-8000-000000000001';

describe('G7 - listing team roster (publish: project members, draft teamMemberIds)', () => {
  const build = (gateOpts: any = {}) => {
    const { gate, transport, asked } = makeMemberGate(IDENTITY as any, gateOpts);
    let roster = [{ userId: OLD, projectRole: 'Contributor', status: 'Active', isLead: false, leadLabel: null }];
    const project: any = { id: PROJECT, userId: OWNER, teamMemberIds: [OLD] };
    const writes: string[] = [];
    const projectRepository: any = {
      findOne: jest.fn(async () => project),
      getProjectMembers: jest.fn(async () => roster),
      upsertProjectMembers: jest.fn(async (_id: string, members: any[]) => {
        writes.push('upsertProjectMembers');
        roster = members.map((m) => ({ projectRole: 'Contributor', status: 'Active', isLead: false, leadLabel: null, ...m }));
      }),
      update: jest.fn(async (_id: string, payload: any) => (writes.push('update'), Object.assign(project, payload))),
    };
    const svc = new PublishService(projectRepository, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, gate);
    return { svc, roster: () => roster, writes, transport, asked, project };
  };

  describe('PUT /publish/project/:id/members', () => {
    it('adds the eligible, returns a result for EVERY entry in order, and does not fail because one is blocked', async () => {
      const { svc, roster } = build();
      const out: any = await svc.saveProjectMembers(OWNER, PROJECT, [{ userId: OLD }, { userId: V }, { userId: U }, { userId: G }, { userId: X }]);
      expect(roster().map((m) => m.userId)).toEqual([OLD, V, G]);
      expect(out.members.map((m: any) => m.userId)).toEqual([OLD, V, G]);
      expect(out.results.map((r: any) => [r.index, r.userId, r.status])).toEqual([
        [0, OLD, 'already_member'], [1, V, 'added'], [2, U, 'blocked_verification'], [3, G, 'added'], [4, X, 'blocked_verification'],
      ]);
      expect(out.results[2]).toMatchObject({ added: false, error: 'VERIFICATION_REQUIRED' });
    });

    it('keeps the entry\'s own fields (role, lead) for those who are added', async () => {
      const { svc, roster } = build();
      await svc.saveProjectMembers(OWNER, PROJECT, [{ userId: OLD }, { userId: V, projectRole: 'Lead', isLead: true }]);
      expect(roster().find((m) => m.userId === V)).toMatchObject({ projectRole: 'Lead', isLead: true });
    });

    it('invalid and duplicate entries are distinguishable from verification failures', async () => {
      const { svc } = build();
      const out: any = await svc.saveProjectMembers(OWNER, PROJECT, [{ userId: V }, { userId: V }, { userId: '' }, { userId: 'nope' }, {} as any, { userId: U }]);
      expect(out.results.map((r: any) => [r.status, r.error ?? null])).toEqual([
        ['added', null], ['duplicate', 'DUPLICATE_MEMBER'], ['invalid', 'INVALID_MEMBER'], ['invalid', 'INVALID_MEMBER'], ['invalid', 'INVALID_MEMBER'], ['blocked_verification', 'VERIFICATION_REQUIRED'],
      ]);
    });

    it('only people newly added are checked - not the owner saving, not existing members - in ONE request', async () => {
      const { svc, transport, asked } = build();
      await svc.saveProjectMembers(OWNER, PROJECT, [{ userId: OWNER }, { userId: OLD }, { userId: V }, { userId: U }]);
      expect(transport).toHaveBeenCalledTimes(1);
      expect(asked().sort()).toEqual([OWNER, V, U].sort()); // OWNER is new to the roster here; OLD (existing) is not asked
      expect(asked()).not.toContain(OLD);
    });

    it('a blocked member produces no membership row and is absent from what is written', async () => {
      const { svc, roster, writes } = build();
      await svc.saveProjectMembers(OWNER, PROJECT, [{ userId: OLD }, { userId: U }]);
      expect(roster().map((m) => m.userId)).toEqual([OLD]);
      expect(writes).toEqual(['upsertProjectMembers']);
    });

    it('gate failure: the request fails (503 IDENTITY_VERIFICATION_UNAVAILABLE) and NOTHING is written', async () => {
      const { svc, roster, writes } = build({ impl: () => throwError(() => new Error('down')) });
      await expect(svc.saveProjectMembers(OWNER, PROJECT, [{ userId: OLD }, { userId: V }])).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
      expect(writes).toEqual([]);
      expect(roster().map((m) => m.userId)).toEqual([OLD]);
    });

    it('authorization is unchanged and decided first: a non-member is refused before any gate lookup', async () => {
      const { svc, transport } = build();
      await expect(svc.saveProjectMembers('99999999-0000-4000-8000-000000000000', PROJECT, [{ userId: V }])).rejects.toBeInstanceOf(ForbiddenException);
      expect(transport).not.toHaveBeenCalled();
    });

    it('a roster of existing members only needs no gate request', async () => {
      const { svc, transport } = build();
      await svc.saveProjectMembers(OWNER, PROJECT, [{ userId: OLD, projectRole: 'Lead' }]);
      expect(transport).not.toHaveBeenCalled();
    });
  });

  describe('PUT /publish/project/:id (draft) with teamMemberIds', () => {
    it('gates newly added teamMemberIds, keeps the eligible, reports per entry, and the rest of the draft still saves', async () => {
      const { svc, project } = build();
      const out: any = await svc.updateProjectDraft(OWNER, PROJECT, { title: 'New title', teamMemberIds: [OLD, V, U] } as any);
      expect(project.teamMemberIds).toEqual([OLD, V]);
      expect(project.title).toBe('New title');
      expect(out.memberResults.map((r: any) => r.status)).toEqual(['already_member', 'added', 'blocked_verification']);
    });

    it('a draft update that does not touch teamMemberIds makes no gate request', async () => {
      const { svc, transport } = build();
      await svc.updateProjectDraft(OWNER, PROJECT, { title: 'Only a title' } as any);
      expect(transport).not.toHaveBeenCalled();
    });

    it('gate failure leaves the draft unchanged', async () => {
      const { svc, writes } = build({ impl: () => throwError(() => new Error('down')) });
      await expect(svc.updateProjectDraft(OWNER, PROJECT, { title: 'x', teamMemberIds: [OLD, V] } as any)).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
      expect(writes).toEqual([]);
    });
  });
});

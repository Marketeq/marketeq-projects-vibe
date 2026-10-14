import 'reflect-metadata';
import { CmsProjectsController } from './cms-projects.controller';
import { RosterGateService } from '../identity-gate/roster-gate.service';
import { InMemoryGateState } from '../identity-gate/testing/in-memory-gate-state.testing';

// G5: CMS project members are authored as assignee EMAILS on the scope tree and
// resolved to platform accounts. On the client-facing project page they follow the
// same rule as every roster: shown only with a linked account whose gate is known
// open. Email-only assignees (no account), closed gates and never-received
// accounts are omitted. The CMS scope itself is never changed.

const ACCT_OPEN = '80000000-0000-4000-8000-000000000001';
const ACCT_CLOSED = '80000000-0000-4000-8000-000000000002';
const ACCT_NEVER = '80000000-0000-4000-8000-000000000003';

const users: Record<string, any> = {
  'open@x.test': { id: ACCT_OPEN, firstName: 'Open', username: 'open' },
  'closed@x.test': { id: ACCT_CLOSED, firstName: 'Closed', username: 'closed' },
  'never@x.test': { id: ACCT_NEVER, firstName: 'Never', username: 'never' },
  // 'emailonly@x.test' has no platform account: user-service answers 404.
};

describe('G5 - CMS project members (assignee emails)', () => {
  const scope = [
    { tasks: [{ assigneeEmail: 'Closed@x.test' }, { assigneeEmail: 'open@x.test' }] },
    { tasks: [{ assigneeEmail: 'emailonly@x.test' }, { assigneeEmail: 'never@x.test' }, { assigneeEmail: 'open@x.test' }] },
  ];
  const run = async (state = new InMemoryGateState().open(ACCT_OPEN).closed(ACCT_CLOSED)) => {
    const controller = new CmsProjectsController({ query: jest.fn() } as any, new RosterGateService(state.asService));
    const fetchMock = jest.fn(async (url: string) => {
      const email = decodeURIComponent(String(url).split('/by-email/')[1]);
      const u = users[email];
      return u ? { ok: true, json: async () => u } : { ok: false, json: async () => ({}) };
    });
    (global as any).fetch = fetchMock;
    const team = await (controller as any).hydrateTeam({ scope });
    return { team, fetchMock, state };
  };
  const originalFetch = (global as any).fetch;
  afterAll(() => ((global as any).fetch = originalFetch));

  it('shows only the assignee whose linked account has a known open gate', async () => {
    const { team } = await run();
    expect(team.map((m: any) => m.username)).toEqual(['open']);
  });

  it('omits email-only assignees (no platform account), closed gates and never-received accounts', async () => {
    const { team } = await run();
    const names = JSON.stringify(team);
    for (const hidden of ['closed', 'never', 'emailonly']) expect(names).not.toContain(hidden);
  });

  it('does not leak the account id in the member payload', async () => {
    const { team } = await run();
    expect(JSON.stringify(team)).not.toContain(ACCT_OPEN);
    expect(team[0].accountId).toBeUndefined();
  });

  it('the first VISIBLE member is the lead (a hidden earlier assignee does not leave the page leadless)', async () => {
    const { team } = await run();
    expect(team[0].isLead).toBe(true);
  });

  it('a member with no known state does not blank the known-visible ones', async () => {
    const { team } = await run();
    expect(team.length).toBe(1);
  });

  it('follows the state: visible again once the closed account opens', async () => {
    const state = new InMemoryGateState().open(ACCT_OPEN).closed(ACCT_CLOSED);
    await state.apply(ACCT_CLOSED, true, new Date(Date.now() + 1000));
    const { team } = await run(state);
    expect(team.map((m: any) => m.username).sort()).toEqual(['closed', 'open']);
  });

  it('an unreadable state table shows nobody; the page still resolves', async () => {
    const state = new InMemoryGateState().open(ACCT_OPEN);
    state.readFails = true;
    const { team } = await run(state);
    expect(team).toEqual([]);
  });

  it('never mutates the CMS scope that the assignees are authored in', async () => {
    const before = JSON.stringify(scope);
    await run();
    expect(JSON.stringify(scope)).toBe(before);
  });
});

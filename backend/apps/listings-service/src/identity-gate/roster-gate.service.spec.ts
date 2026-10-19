import { RosterGateService } from './roster-gate.service';
import { InMemoryGateState } from './testing/in-memory-gate-state.testing';
import { AccountGateStateService } from './account-gate-state.service';

const OPEN_ACCT = 'a0000000-0000-4000-8000-000000000001';
const GRACE_ACCT = 'a0000000-0000-4000-8000-000000000002'; // identity reports in-grace as open
const CLOSED_ACCT = 'a0000000-0000-4000-8000-000000000003';
const NEVER_SEEN = 'a0000000-0000-4000-8000-000000000004';

// G5 - the one rule behind every client-facing roster: shown only with a KNOWN
// OPEN gate, decided from local last-known state.
describe('RosterGateService (G5)', () => {
  const build = () => {
    const state = new InMemoryGateState().open(OPEN_ACCT, GRACE_ACCT).closed(CLOSED_ACCT);
    return { state, roster: new RosterGateService(state.asService) };
  };

  it('keeps known-open accounts (verified and grace) and drops known-closed ones', async () => {
    const { roster } = build();
    expect([...(await roster.visibleUserIds([OPEN_ACCT, GRACE_ACCT, CLOSED_ACCT]))].sort()).toEqual([OPEN_ACCT, GRACE_ACCT].sort());
  });

  it('an account whose state has never been received is not visible, and does not blank the others', async () => {
    const { roster } = build();
    const shown = await roster.visibleUserIds([OPEN_ACCT, NEVER_SEEN, GRACE_ACCT]);
    expect(shown.has(NEVER_SEEN)).toBe(false);
    expect(shown.has(OPEN_ACCT)).toBe(true);
    expect(shown.has(GRACE_ACCT)).toBe(true);
  });

  it('email-only records (no platform account, so no id) are never visible', async () => {
    const { roster } = build();
    expect([...(await roster.visibleUserIds([null, undefined, '', OPEN_ACCT]))]).toEqual([OPEN_ACCT]);
  });

  it('is one lookup for the whole roster, however many members it covers', async () => {
    const { roster, state } = build();
    await roster.visibleUserIds([OPEN_ACCT, GRACE_ACCT, CLOSED_ACCT, NEVER_SEEN, OPEN_ACCT]);
    expect(state.reads).toBe(1);
  });

  it('follows the state: a gate that closes is hidden on the next read and returns when it reopens', async () => {
    const { roster, state } = build();
    expect((await roster.visibleUserIds([OPEN_ACCT])).has(OPEN_ACCT)).toBe(true);
    await state.apply(OPEN_ACCT, false, new Date(Date.now() + 1000));
    expect((await roster.visibleUserIds([OPEN_ACCT])).has(OPEN_ACCT)).toBe(false);
    await state.apply(OPEN_ACCT, true, new Date(Date.now() + 2000));
    expect((await roster.visibleUserIds([OPEN_ACCT])).has(OPEN_ACCT)).toBe(true);
  });

  it('has no way to call identity: its only dependency is the local state', () => {
    expect(Reflect.getMetadata('design:paramtypes', RosterGateService)).toEqual([AccountGateStateService]);
  });

  it('an unreadable state table shows nobody and throws nothing', async () => {
    const { roster, state } = build();
    state.readFails = true;
    await expect(roster.visibleUserIds([OPEN_ACCT])).resolves.toEqual(new Set());
  });
});

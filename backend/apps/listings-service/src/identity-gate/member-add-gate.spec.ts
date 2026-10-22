import 'reflect-metadata';
import { throwError, of } from 'rxjs';
import { CLOSED, OPEN, makeMemberGate } from './testing/member-gate.testing';
import { IdentityVerificationUnavailableException } from './identity-gate.exceptions';

// G7: the evaluation shared by every bulk-capable direct-add route in listings-service.
const A = '10000000-0000-4000-8000-00000000000a'; // verified
const B = '10000000-0000-4000-8000-00000000000b'; // unverified
const C = '10000000-0000-4000-8000-00000000000c'; // grace (identity reports open)
const D = '10000000-0000-4000-8000-00000000000d'; // expired
const E = '10000000-0000-4000-8000-00000000000e'; // already on the roster, now closed
const OWNER = '10000000-0000-4000-8000-0000000000f0';
const IDENTITY = { [A]: OPEN, [B]: CLOSED('both'), [C]: OPEN, [D]: CLOSED('identity'), [E]: CLOSED('both'), [OWNER]: OPEN };

describe('G7 MemberAddGate (shared bulk evaluation)', () => {
  it('adds the eligible and reports the blocked, one result per input in input order', async () => {
    const { gate } = makeMemberGate(IDENTITY);
    const { results, keep } = await gate.evaluate([A, B, C, D], []);
    expect(results.map((r) => [r.index, r.userId, r.status, r.added])).toEqual([
      [0, A, 'added', true], [1, B, 'blocked_verification', false], [2, C, 'added', true], [3, D, 'blocked_verification', false],
    ]);
    expect(keep).toEqual([true, false, true, false]);
  });

  it('a blocked member carries the SAME code invitation acceptance returns (VERIFICATION_REQUIRED)', async () => {
    const { gate } = makeMemberGate(IDENTITY);
    const { results } = await gate.evaluate([B], []);
    expect(results[0]).toMatchObject({ added: false, status: 'blocked_verification', error: 'VERIFICATION_REQUIRED' });
    expect(JSON.stringify(results[0])).not.toMatch(/missingRequirements|identity|location|grace|expired/i);
  });

  it('invalid, duplicate, already-member and verification-blocked entries have DISTINCT codes', async () => {
    const { gate } = makeMemberGate(IDENTITY);
    const { results } = await gate.evaluate([A, 'not-a-user', A, null, B, E, ''], [E]);
    const by = Object.fromEntries(results.map((r) => [r.index, r]));
    expect(by[0]).toMatchObject({ status: 'added' });
    expect(by[1]).toMatchObject({ status: 'invalid', error: 'INVALID_MEMBER', added: false });
    expect(by[2]).toMatchObject({ status: 'duplicate', error: 'DUPLICATE_MEMBER', added: false });
    expect(by[3]).toMatchObject({ status: 'invalid', error: 'INVALID_MEMBER' });
    expect(by[4]).toMatchObject({ status: 'blocked_verification', error: 'VERIFICATION_REQUIRED' });
    expect(by[5]).toMatchObject({ status: 'already_member', added: false });
    expect(by[6]).toMatchObject({ status: 'invalid' });
    expect(new Set([by[1].error, by[2].error, by[4].error]).size).toBe(3);
  });

  it('a duplicate of a BLOCKED person is a duplicate, not a second block, and neither is added', async () => {
    const { gate } = makeMemberGate(IDENTITY);
    const { results, keep } = await gate.evaluate([B, B], []);
    expect(results.map((r) => r.status)).toEqual(['blocked_verification', 'duplicate']);
    expect(keep).toEqual([false, false]);
  });

  it('is ONE batch gate request for everyone new - not one per member - and only new members are asked about', async () => {
    const { gate, transport, asked } = makeMemberGate(IDENTITY);
    await gate.evaluate([A, B, C, D, E, A], [E]);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][0]).toBe('identity_verification.gate_check_batch');
    expect(asked().sort()).toEqual([A, B, C, D].sort()); // not E (already a member), not the duplicate again
  });

  it('an existing member is kept without being re-gated, even if their own gate has since closed', async () => {
    const { gate, transport } = makeMemberGate(IDENTITY);
    const { results, keep } = await gate.evaluate([E], [E]);
    expect(results[0].status).toBe('already_member');
    expect(keep).toEqual([true]);
    expect(transport).not.toHaveBeenCalled();
  });

  it('an exempt person (the creator\'s own bootstrap membership) is not gated; the actor is never evaluated', async () => {
    const { gate, asked } = makeMemberGate(IDENTITY);
    const { results } = await gate.evaluate([OWNER, A], [], [OWNER]);
    expect(results.map((r) => r.status)).toEqual(['added', 'added']);
    expect(asked()).toEqual([A]);
  });

  it('an entry identity does not mention is not open (never "added by default")', async () => {
    const { gate } = makeMemberGate({}, { impl: () => of({ decisions: [] }) });
    const { results } = await gate.evaluate([A], []);
    expect(results[0].status).toBe('blocked_verification');
  });

  it('needs no gate request at all when nobody is new', async () => {
    const { gate, transport } = makeMemberGate(IDENTITY);
    await gate.evaluate([], []);
    await gate.evaluate([E], [E]);
    expect(transport).not.toHaveBeenCalled();
  });

  describe('gate failure follows the invitation-acceptance rule: the request fails, nobody is added', () => {
    it.each([
      ['RPC error', () => throwError(() => new Error('no consumer'))],
      ['malformed reply', () => of({ decisions: 'x' })],
      ['one malformed entry', () => of({ decisions: [{ userId: A, gateOpen: true, missingRequirements: 'identity' }] })],
    ])('%s -> IdentityVerificationUnavailableException (503 IDENTITY_VERIFICATION_UNAVAILABLE)', async (_l, impl) => {
      const { gate } = makeMemberGate(IDENTITY, { impl });
      const failure = gate.evaluate([A, B], []);
      await expect(failure).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
      await failure.catch((e) => {
        expect(e.getStatus()).toBe(503);
        expect(e.getResponse()).toMatchObject({ success: false, error: 'IDENTITY_VERIFICATION_UNAVAILABLE' });
      });
    });

    it('no broker configured -> the same, with no request sent', async () => {
      const { gate, transport } = makeMemberGate(IDENTITY, { broker: undefined });
      await expect(gate.evaluate([A], [])).rejects.toBeInstanceOf(IdentityVerificationUnavailableException);
      expect(transport).not.toHaveBeenCalled();
    });
  });
});

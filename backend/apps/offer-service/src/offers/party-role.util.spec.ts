// apps/offer-service/src/offers/party-role.util.spec.ts
// Regression guard for the FORBIDDEN_FOR_ROLE fix: RolesGuard used to read
// request.user.role, which libs/auth's JwtStrategy never sets, so every
// role-gated action on an existing offer 403'd regardless of who called
// it. derivePartyRole/resolveEffectiveRole (guards/party-role.util.ts) are
// what OfferPartyGuard and RolesGuard now actually call, so testing them
// directly is testing the real fix, not a parallel reimplementation. Style
// matches offer-list-query.builder.spec.ts and offer-state-machine.spec.ts:
// pure functions, plain fixture objects, no mocking.
import { derivePartyRole, resolveEffectiveRole } from '../guards/party-role.util';
import { UserRole } from '../common/types/user-role.enum';

describe('derivePartyRole', () => {
  const offer = { clientId: 'C1', talentId: 'T1' };

  it('derives TALENT for the offer\'s talent', () => {
    expect(derivePartyRole(offer, 'T1')).toBe(UserRole.TALENT);
  });

  it('derives CLIENT for the offer\'s client', () => {
    expect(derivePartyRole(offer, 'C1')).toBe(UserRole.CLIENT);
  });

  it('derives null for a user who is neither party — 403, unchanged', () => {
    expect(derivePartyRole(offer, 'X9')).toBeNull();
  });
});

describe('resolveEffectiveRole', () => {
  it('prefers the offer-derived party role over a disagreeing JWT claim', () => {
    // The offer says this requester is TALENT; a stale/wrong claim on
    // request.user.role says CLIENT. The offer-derived role must win —
    // this is the exact behavior FR-13's fix depends on.
    expect(resolveEffectiveRole(UserRole.TALENT, 'CLIENT')).toBe(UserRole.TALENT);
  });

  it('prefers the offer-derived role even when the claim is the same value', () => {
    expect(resolveEffectiveRole(UserRole.CLIENT, 'CLIENT')).toBe(UserRole.CLIENT);
  });

  it('falls back to the JWT claim when no offer is in scope (e.g. createOffer)', () => {
    expect(resolveEffectiveRole(undefined, 'CLIENT')).toBe('CLIENT');
  });

  it('uppercases a lowercase JWT claim on the fallback path, same as before', () => {
    expect(resolveEffectiveRole(undefined, 'client')).toBe('CLIENT');
  });

  it('falls back to undefined when neither is available', () => {
    expect(resolveEffectiveRole(undefined, undefined)).toBeUndefined();
  });
});

describe('accept/decline — TALENT-only route, role derived from the offer', () => {
  const offer = { clientId: 'C1', talentId: 'T1' };
  const requiredRoles: UserRole[] = [UserRole.TALENT];

  it('the talent on the offer can accept/decline', () => {
    const role = resolveEffectiveRole(derivePartyRole(offer, 'T1') ?? undefined, undefined);
    expect(role).toBeDefined();
    expect(requiredRoles.includes(role as UserRole)).toBe(true);
  });

  it('the client on the SAME offer cannot', () => {
    const role = resolveEffectiveRole(derivePartyRole(offer, 'C1') ?? undefined, undefined);
    expect(role).toBeDefined();
    expect(requiredRoles.includes(role as UserRole)).toBe(false);
  });
});

describe('withdraw — CLIENT-only route, role derived from the offer', () => {
  const offer = { clientId: 'C1', talentId: 'T1' };
  const requiredRoles: UserRole[] = [UserRole.CLIENT];

  it('the client on the offer can withdraw', () => {
    const role = resolveEffectiveRole(derivePartyRole(offer, 'C1') ?? undefined, undefined);
    expect(requiredRoles.includes(role as UserRole)).toBe(true);
  });

  it('the talent cannot', () => {
    const role = resolveEffectiveRole(derivePartyRole(offer, 'T1') ?? undefined, undefined);
    expect(requiredRoles.includes(role as UserRole)).toBe(false);
  });

  it('a user who is neither party gets no derivable role at all — 403, unchanged', () => {
    const role = derivePartyRole(offer, 'X9');
    expect(role).toBeNull();
  });
});

describe('editOffer — CLIENT-only route, role derived from the offer', () => {
  const offer = { clientId: 'C1', talentId: 'T1' };
  const requiredRoles: UserRole[] = [UserRole.CLIENT];

  it('the client on the offer can edit it', () => {
    const role = resolveEffectiveRole(derivePartyRole(offer, 'C1') ?? undefined, undefined);
    expect(role).toBeDefined();
    expect(requiredRoles.includes(role as UserRole)).toBe(true);
  });

  it('the talent cannot', () => {
    const role = resolveEffectiveRole(derivePartyRole(offer, 'T1') ?? undefined, undefined);
    expect(role).toBeDefined();
    expect(requiredRoles.includes(role as UserRole)).toBe(false);
  });
});

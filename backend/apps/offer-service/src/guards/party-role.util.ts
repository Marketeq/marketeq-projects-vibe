// apps/offer-service/src/guards/party-role.util.ts
// Pure decision logic behind OfferPartyGuard/RolesGuard's role derivation
// — dependency-free (no repo, no ExecutionContext) so it's unit-testable
// the same way as offer-list-query.builder.ts: plain inputs, plain
// outputs, no mocking.
import { UserRole } from '../common/types/user-role.enum';

/**
 * Which party (if any) userId is on this offer. Returns null when the
 * user is neither the client nor the talent — OfferPartyGuard turns that
 * into the existing 403 (OFFER_ACCESS_DENIED), unchanged.
 */
export const derivePartyRole = (
  offer: { clientId: string; talentId: string },
  userId: string,
): UserRole | null => {
  if (offer.clientId === userId) return UserRole.CLIENT;
  if (offer.talentId === userId) return UserRole.TALENT;
  return null;
};

/**
 * The role RolesGuard treats as authoritative for this request.
 * partyRole (from OfferPartyGuard, derived from actual offer membership)
 * always wins when present — including when it disagrees with the JWT's
 * own claimed role, which is untrustworthy here (libs/auth's JwtStrategy
 * never sets it; see offer-party.guard.ts's comment). Only falls back to
 * the claimed role when there's no offer in scope to derive one from
 * (e.g. createOffer) — that path is unchanged from before this fix.
 */
export const resolveEffectiveRole = (
  partyRole: UserRole | undefined,
  claimedRole: unknown,
): string | undefined => {
  if (partyRole) return partyRole;
  return typeof claimedRole === 'string' ? claimedRole.toUpperCase() : (claimedRole as string | undefined);
};

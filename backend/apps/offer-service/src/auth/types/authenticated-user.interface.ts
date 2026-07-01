// apps/offer-service/src/auth/types/authenticated-user.interface.ts
// OS-36: Typed interface for req.user after JWT validation.
export interface AuthenticatedUser {
  sub: string;   // userId (UUID) — matches Offer.clientId or Offer.talentId
  role: 'CLIENT' | 'TALENT';
}
// apps/offer-service/src/common/decorators/current-party-role.decorator.ts
// Extracts the role OfferPartyGuard derived from actual offer party
// membership (request.partyRole) — NOT request.user.role, which
// libs/auth's JwtStrategy never sets (see offer-party.guard.ts's comment
// for the full story). Only populated on routes guarded by OfferPartyGuard
// with an offer in scope; undefined otherwise (e.g. offer creation).
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../types/user-role.enum';

export const CurrentPartyRole = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UserRole | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.partyRole;
  },
);

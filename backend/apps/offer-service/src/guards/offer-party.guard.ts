// apps/offer-service/src/guards/offer-party.guard.ts
// OS-12: Verifies user is clientId or talentId on the offer.
// Returns same 403 for not-found and not-a-party — prevents enumeration.
// Pre-loads the offer onto request.offer for downstream use.
import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer } from '../offers/entities/offer.entity';
import { derivePartyRole } from './party-role.util';

@Injectable()
export class OfferPartyGuard implements CanActivate {
  constructor(
    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.user?.sub;

    // Support both /v1/offers/:id and /v1/offers/:offerId/counter-offers/:id
    const offerId = request.params?.offerId || request.params?.id;
    if (!offerId) return true; // No offer param — skip (creation endpoints)

    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    const partyRole = offer ? derivePartyRole(offer, userId) : null;

    // Same 403 for "not found" and "not a party" — anti-enumeration.
    // Exactly as strict as the previous inline check
    // (offer.clientId !== userId && offer.talentId !== userId) — just
    // expressed through the same derivePartyRole call that produces the
    // role below, instead of a second, separately-maintained comparison.
    if (!offer || partyRole === null) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'OFFER_ACCESS_DENIED',
        message: "You don't have access to this offer.",
      });
    }

    request.offer = offer;
    // NOT copied from the JWT. libs/auth's JwtStrategy.validate() only
    // ever returns { id, sub, email }; it never sets a role claim, which
    // is why RolesGuard reading request.user.role was always undefined
    // for these routes. Stored as request.partyRole (not on request.user)
    // so nothing downstream mistakes this for a verified token claim.
    // Authoritative for role checks on THIS offer only — see RolesGuard
    // and common/decorators/current-party-role.decorator.ts.
    request.partyRole = partyRole;
    return true;
  }
}
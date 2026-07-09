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

    // Same 403 for "not found" and "not a party" — anti-enumeration
    if (!offer || (offer.clientId !== userId && offer.talentId !== userId)) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'OFFER_ACCESS_DENIED',
        message: "You don't have access to this offer.",
      });
    }

    request.offer = offer;
    return true;
  }
}
// apps/offer-service/src/offers/guards/offer-action.guard.ts
// OS-25: Pre-controller role + state check. Catches invalid actions at HTTP layer.
import {
  Injectable, CanActivate, ExecutionContext,
  ForbiddenException, SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OfferStatus } from '../enums/offer-status.enum';

export const OFFER_ACTION_KEY = 'offerAction';

export interface OfferActionMeta {
  /** The status the offer must be in for this action to proceed. */
  requireStatus: OfferStatus | OfferStatus[];
  /** The role the requester must have. */
  requireRole: 'CLIENT' | 'TALENT' | 'EITHER';
}

/**
 * @OfferAction decorator — attach allowed status + role metadata to a route.
 *
 * @example
 * @OfferAction({ requireStatus: OfferStatus.PENDING, requireRole: 'TALENT' })
 * @Post(':id/accept')
 * async accept(...) {}
 */
export const OfferAction = (meta: OfferActionMeta) =>
  SetMetadata(OFFER_ACTION_KEY, meta);

/**
 * OfferActionGuard — validates role and offer status before the route handler.
 *
 * Apply as @UseGuards(OfferPartyGuard, OfferActionGuard).
 * OfferPartyGuard must run first to attach req.offer.
 */
@Injectable()
export class OfferActionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.get<OfferActionMeta>(
      OFFER_ACTION_KEY,
      context.getHandler(),
    );

    if (!meta) return true; // No metadata: guard is a no-op.

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const offer = req.offer; // Attached by OfferPartyGuard

    if (!offer) {
      throw new ForbiddenException(
        'Offer not loaded. Ensure OfferPartyGuard runs first.',
      );
    }

    // Check role.
    if (meta.requireRole !== 'EITHER') {
      const isClient = meta.requireRole === 'CLIENT';
      const partyId = isClient ? offer.clientId : offer.talentId;
      // Check both sub and id — JWT may carry either
      const requesterId = user.sub ?? user.id;
      if (partyId !== requesterId) {
        const role = isClient ? 'client' : 'talent';
        throw new ForbiddenException(
          `Only the ${role} on this offer can perform this action.`,
        );
      }
    }

    // Check offer status.
    const allowed = Array.isArray(meta.requireStatus)
      ? meta.requireStatus
      : [meta.requireStatus];

    if (!allowed.includes(offer.status)) {
      throw new ForbiddenException(
        `This action requires the offer to be in status: ${allowed.join(' or ')}. ` +
        `Current status: ${offer.status}.`,
      );
    }

    return true;
  }
}
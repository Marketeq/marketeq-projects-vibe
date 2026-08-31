// apps/offer-service/src/guards/listing-owner.guard.ts
// Authorization for POST /v1/offers (createOffer) without a JWT role
// claim. libs/auth's JwtStrategy.validate() only ever returns
// { id, sub, email } — no role — and auth-service's User entity has no
// role column to add one from (upstream, CTO-only, out of scope here;
// see roles.guard.ts's comment for the same story). There is also no
// existing offer to derive a party from (this IS the offer-creation
// route), so OfferPartyGuard's approach doesn't apply either.
//
// Authorization here is listing ownership instead: only the client who
// owns jobListingId may create an offer against it. Replaces
// @Roles(CLIENT)+RolesGuard on this one route only — every other route
// keeps RolesGuard unchanged.
import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ListingsClient,
  ListingNotFoundOrAccessDeniedException,
} from '../integrations/listings.client';

@Injectable()
export class ListingOwnerGuard implements CanActivate {
  private readonly logger = new Logger(ListingOwnerGuard.name);

  constructor(private readonly listingsClient: ListingsClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = (request as any).user?.sub || (request as any).user?.id;
    const jobListingId = (request.body as Record<string, unknown> | undefined)?.jobListingId;

    if (typeof jobListingId !== 'string' || jobListingId.length === 0) {
      // Malformed or missing — defer to CreateOfferDto's @IsUUID
      // validation (runs after guards, via ValidationPipe) for a proper
      // 400 instead of a vague 403 here. A bogus id can't own a real
      // listing anyway, so this doesn't weaken anything: offersService
      // .create() still calls listingsClient.validateListing() itself.
      return true;
    }

    const authHeader = request.headers['authorization'] as string | undefined;
    const clientJwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    try {
      await this.listingsClient.validateListing(jobListingId, userId, clientJwt);
      return true;
    } catch (err) {
      // Not the owner, or the listing doesn't exist — same anti-
      // enumeration shape as OfferPartyGuard's OFFER_ACCESS_DENIED: one
      // generic 403 for both causes, so a caller can't distinguish
      // "not yours" from "doesn't exist" by probing listing ids.
      if (err instanceof ListingNotFoundOrAccessDeniedException) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'LISTING_ACCESS_DENIED',
          message: 'You do not have access to this job listing.',
        });
      }
      // Anything else — not-published (422, a real business-state error,
      // not an authorization one, so it's fine to expose), listings-
      // service unreachable (503), or an unexpected error — propagates
      // as-is. In particular this fails CLOSED when listings-service is
      // unreachable: the exception blocks the request, it never falls
      // through to allow.
      this.logger.debug(`ListingOwnerGuard: validateListing failed for listing ${jobListingId}: ${(err as Error).message}`);
      throw err;
    }
  }
}

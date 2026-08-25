// apps/offer-service/src/common/decorators/current-offer.decorator.ts
// OS-12: Extracts the offer pre-loaded by OfferPartyGuard. Avoids second DB call.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentOffer = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.offer;
  },
);
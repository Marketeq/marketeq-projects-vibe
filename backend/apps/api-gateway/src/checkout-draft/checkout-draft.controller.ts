import { Controller, Get, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { CheckoutDraftGatewayService } from './checkout-draft.service';

// Both prefixes, because the frontend's base URL is not consistent about the
// `/api` segment (see ClientIpController for the same issue/fix). Registered
// ahead of ProxyController in api-gateway.module.ts so this specific route
// wins over the generic /v1/checkout/* passthrough.
@Controller(['v1/checkout', 'api/v1/checkout'])
export class CheckoutDraftController {
  constructor(private readonly checkoutDraftService: CheckoutDraftGatewayService) {}

  @Get('listings/:listingId/summary')
  getListingSummary(@Param('listingId') listingId: string, @Req() req: Request) {
    const cookieToken = (req as any).cookies?.access_token as string | undefined;
    const authorization =
      (req.headers.authorization as string | undefined) ??
      (cookieToken ? `Bearer ${cookieToken}` : undefined);

    return this.checkoutDraftService.getListingSummary(listingId, authorization);
  }
}

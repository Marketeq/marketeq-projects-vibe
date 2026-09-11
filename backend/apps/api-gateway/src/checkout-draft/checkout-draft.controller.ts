import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CheckoutDraftGatewayService } from './checkout-draft.service';

// Both prefixes, because the frontend's base URL is not consistent about the
// `/api` segment (see ClientIpController for the same issue/fix). Registered
// ahead of ProxyController in api-gateway.module.ts so this specific route
// wins over the generic /v1/checkout/* passthrough.
@Controller(['v1/checkout', 'api/v1/checkout'])
export class CheckoutDraftController {
  constructor(private readonly checkoutDraftService: CheckoutDraftGatewayService) {}

  // Guarded so an unauthenticated request fails fast at the gateway with a
  // consistent 401. Once authenticated here, we pass req.user.userId (this
  // gateway's JwtStrategy.validate() names the sub claim "userId", not
  // "sub") down to checkout-service as an explicit clientId instead of
  // forwarding the raw Authorization header — checkout-service now trusts
  // this call via INTERNAL_SERVICE_TOKEN (InternalTokenGuard) rather than
  // re-validating a user JWT itself.
  @Get('listings/:listingId/summary')
  @UseGuards(JwtAuthGuard)
  getListingSummary(@Param('listingId') listingId: string, @Req() req: any) {
    return this.checkoutDraftService.getListingSummary(listingId, req.user.userId);
  getListingSummary(@Param('listingId') listingId: string, @Req() req: Request) {
    const clientId = (req as any).user?.userId as string;

    return this.checkoutDraftService.getListingSummary(listingId, clientId);
  }
}

import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CheckoutDraftGatewayService } from './checkout-draft.service';

// Both prefixes, because the frontend's base URL is not consistent about the
// `/api` segment (see ClientIpController for the same issue/fix). Registered
// ahead of ProxyController in api-gateway.module.ts so this specific route
// wins over the generic /v1/checkout/* passthrough.
@Controller(['v1/checkout', 'api/v1/checkout'])
export class CheckoutDraftController {
  constructor(private readonly checkoutDraftService: CheckoutDraftGatewayService) {}

  @Get('listings/:listingId/summary')
  @UseGuards(JwtAuthGuard)
  getListingSummary(@Param('listingId') listingId: string, @Req() req: any) {
    return this.checkoutDraftService.getListingSummary(listingId, req.user.sub);
  }
}

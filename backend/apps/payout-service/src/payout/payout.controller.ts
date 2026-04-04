// apps/payout-service/src/payout/payout.controller.ts
// PS-02 + PS-14: Payout endpoints
// PS-14: GET /verify-email (no auth — token IS the auth), POST /:id/resend-verification
import { Controller, Post, Get, Delete, Body, Param, Query,
         UseGuards, Request, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { PayoutService }       from './payout.service';
import { MagicLinkService }    from '../magic-link/magic-link.service';
import { JwtAuthGuard }        from '../guards/jwt-auth.guard';
import { ValidateAmountDto }   from './dto/validate-amount.dto';
import { InitiatePayoutDto }   from './dto/initiate-payout.dto';

@Controller('v1/payouts')
export class PayoutController {
  constructor(
    private readonly payoutService: PayoutService,
    private readonly magicLinkService: MagicLinkService,
  ) {}

  // Step 1+2: Validate amount and get fee preview
  @UseGuards(JwtAuthGuard)
  @Post('validate-amount')
  @HttpCode(200)
  async validateAmount(@Request() req: any, @Body() dto: ValidateAmountDto) {
    return this.payoutService.validateAmount(req.user.userId, dto);
  }

  // Step 4: Initiate withdrawal — creates payout_request, sends magic link
  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  @HttpCode(200)
  async initiate(@Request() req: any, @Body() dto: InitiatePayoutDto) {
    return this.payoutService.initiate(req.user.userId, dto);
  }

  // PS-02 (legacy): Magic link verification via token only
  @Get('verify')
  @HttpCode(200)
  async verify(@Query('token') token: string) {
    return this.payoutService.verifyMagicLink(token);
  }

  // PS-14 §5: Magic link verification via token + payoutRequestId
  // NO auth header required — token IS the authentication for this step
  @Get('verify-email')
  @HttpCode(200)
  async verifyEmail(
    @Query('token') token: string,
    @Query('id') payoutRequestId: string,
  ) {
    if (!token || !payoutRequestId) {
      return { statusCode: 400, message: 'Missing token or id parameter.' };
    }
    return this.magicLinkService.verifyEmailToken(token, payoutRequestId);
  }

  // PS-14 §7: Resend verification email (rate-limited: max 3 per payout)
  @UseGuards(JwtAuthGuard)
  @Post(':id/resend-verification')
  @HttpCode(200)
  async resendVerification(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.magicLinkService.resendVerification(req.user.userId, id);
  }

  // Cancel a pending/queued withdrawal
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(200)
  async cancel(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.payoutService.cancel(req.user.userId, id);
  }
}
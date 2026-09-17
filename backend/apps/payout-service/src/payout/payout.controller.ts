// apps/payout-service/src/payout/payout.controller.ts
// PS-02 + PS-14: Payout endpoints
// PS-14: GET /verify-email (no auth — token IS the auth), POST /:id/resend-verification
import { Controller, Post, Get, Delete, Body, Param, Query,
         UseGuards, Request, HttpCode, ParseUUIDPipe, Res, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { PayoutService }       from './payout.service';
import { MagicLinkService }    from '../magic-link/magic-link.service';
import { JwtAuthGuard }        from '../guards/jwt-auth.guard';
import { RolesGuard, Roles }   from '../guards/roles.guard';
import { ValidateAmountDto }   from './dto/validate-amount.dto';
import { InitiatePayoutDto }   from './dto/initiate-payout.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Public }              from '../decorators/public.decorator';

@Controller('v1/payouts')
export class PayoutController {
  constructor(
    private readonly payoutService: PayoutService,
    private readonly magicLinkService: MagicLinkService,
  ) {}

  // US-30/31: pre-flight KYC/first-payout-hold check for the withdrawal screen
  @UseGuards(JwtAuthGuard)
  @Get('gate-check')
  @HttpCode(200)
  async gateCheck(@Request() req: any) {
    return this.payoutService.checkGate(req.user.userId);
  }

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
    return this.payoutService.initiate(req.user.userId, dto, req.user.email);
  }

  // PS-02 (legacy): Magic link verification via token only. Must bypass the
  // app-wide JwtAuthGuard (APP_GUARD in app.module.ts) — a contractor
  // clicking this link is explicitly not logged in (AC-18.05/18.06: "works
  // fully logged out, on any device"), so there is no Marketeq auth header
  // to send. The token itself is the credential.
  @Public()
  @Get('verify')
  @HttpCode(200)
  async verify(@Query('token') token: string) {
    return this.payoutService.verifyMagicLink(token);
  }

  // PS-14 §5: Magic link verification via token + payoutRequestId
  // NO auth header required — token IS the authentication for this step
  @Public()
  @Get('verify-email')
  @HttpCode(200)
  async verifyEmail(
    @Query('token') token: string,
    @Query('id') payoutRequestId: string,
  ) {
    if (!token || !payoutRequestId) {
      return { statusCode: 400, message: 'Missing token or id parameter.' };
    }
    const result = await this.magicLinkService.verifyEmailToken(token, payoutRequestId);
    // Bug fix: verifyEmailToken() only advances status to QUEUED — it has no
    // queue access to actually schedule processing. Without this, a verified
    // withdrawal would sit at QUEUED forever and never settle.
    if (result.status === 'verified') {
      await this.payoutService.enqueueForProcessing(payoutRequestId);
    }
    return result;
  }

  // PS-14 §7: Resend verification email (rate-limited: max 3 per payout)
  @UseGuards(JwtAuthGuard)
  @Post(':id/resend-verification')
  @HttpCode(200)
  async resendVerification(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResendVerificationDto,
  ) {
    return this.magicLinkService.resendVerification(req.user.userId, id, req.user.email, dto.redirectUrl);
  }

  // Cancel a pending/queued withdrawal
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(200)
  async cancel(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.payoutService.cancel(req.user.userId, id);
  }

  // PS-15 §6.2: Admin — list payouts held for EDD compliance review.
  // Declared before ':id' below (same reasoning as 'summary'/'export') so
  // the literal 'admin' segment is never swallowed by the :id param route.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/awaiting-edd')
  @HttpCode(200)
  async listAwaitingEDD() {
    return this.payoutService.listAwaitingEDD();
  }

  // PS-15 §6.2: Admin — release a payout past EDD review, straight to QUEUED.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/release-edd')
  @HttpCode(200)
  async releaseEDD(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.payoutService.releaseEDD(id, req.user.userId);
  }

  // US-27/AC-27.07: paginated payout history — declared after the literal
  // 'verify'/'verify-email' routes above so ':id' below never shadows them.
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(200)
  async list(
    @Request() req: any, @Query('page') page?: string, @Query('pageSize') pageSize?: string,
    @Query('status') status?: string, @Query('search') search?: string,
    @Query('dateRange') dateRange?: string, @Query('depositMethodId') depositMethodId?: string,
    @Query('from') from?: string, @Query('to') to?: string,
  ) {
    return this.payoutService.listPayouts(
      req.user.userId, parseInt(page ?? '1', 10) || 1, parseInt(pageSize ?? '20', 10) || 20,
      status, search, dateRange, depositMethodId, from, to,
    );
  }

  // Figma "Total Payouts This Month" stat card — declared before ':id' below
  // so the literal 'summary' segment is never swallowed by the :id param route.
  @UseGuards(JwtAuthGuard)
  @Get('summary')
  @HttpCode(200)
  async summary(@Request() req: any) {
    return this.payoutService.getMonthlySummary(req.user.userId);
  }

  // Payouts tab "Export" — declared before ':id' below so the literal
  // 'export' segment is never swallowed by the :id param route (same
  // reasoning as 'summary' above).
  @UseGuards(JwtAuthGuard)
  @Get('export')
  async export(
    @Request() req: any, @Res() res: Response,
    @Query('format') format?: string, @Query('status') status?: string,
    @Query('search') search?: string, @Query('dateRange') dateRange?: string,
    @Query('depositMethodId') depositMethodId?: string,
    @Query('from') from?: string, @Query('to') to?: string,
  ) {
    const fmt = format === 'pdf' ? 'pdf' : 'csv';
    if (format && format !== 'csv' && format !== 'pdf') {
      throw new BadRequestException('format must be csv or pdf');
    }
    const { buffer, filename, contentType } = await this.payoutService.exportPayouts(
      req.user.userId, fmt, status, search, dateRange, depositMethodId, req.user.email,
      from, to,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.status(200).end(buffer);
  }

  // US-28: full detail for a single payout request
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @HttpCode(200)
  async detail(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.payoutService.getPayoutDetail(req.user.userId, id);
  }
}
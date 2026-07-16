import { Controller, Get, Post, Query, Param, Res, UseGuards, Request, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { Response }      from 'express';
import { OAuthService }  from './oauth.service';
import { JwtAuthGuard }  from '../guards/jwt-auth.guard';

@Controller('v1/oauth')
export class OAuthCallbackController {
  constructor(private readonly oauthSvc: OAuthService) {}

  // Callback routes — no JWT required (redirected from provider)
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    // AC-07.03/07.04, AC-08.03/08.04: return the contractor to the actual Transactions
    // page (Payouts tab) rather than a hardcoded, nonexistent route. Uses the same
    // FE_ORIGIN env var main.ts already uses for CORS — never hardcode the frontend origin.
    const feOrigin = process.env.FE_ORIGIN || 'http://localhost:3000';
    try {
      const result = await this.oauthSvc.handleCallback(provider.toUpperCase(), code, state);
      res.redirect(`${feOrigin}/earnings?tab=payouts&oauth=success&methodId=${result.methodId}`);
    } catch (err: any) {
      res.redirect(`${feOrigin}/earnings?tab=payouts&oauth=error&code=${err.errorCode ?? 'unknown'}`);
    }
  }
}

// Reauthorize route — JWT required
@Controller('v1/deposit-methods')
@UseGuards(JwtAuthGuard)
export class OAuthReauthorizeController {
  constructor(private readonly oauthSvc: OAuthService) {}

  @Post(':id/reauthorize')
  @HttpCode(200)
  async reauthorize(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.oauthSvc.reauthorize(req.user.userId, id);
  }
}

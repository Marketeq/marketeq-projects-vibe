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
    try {
      const result = await this.oauthSvc.handleCallback(provider.toUpperCase(), code, state);
      res.redirect(`http://localhost:3000/settings/payouts?oauth=success&methodId=${result.methodId}`);
    } catch (err: any) {
      res.redirect(`http://localhost:3000/settings/payouts?oauth=error&code=${err.errorCode ?? 'unknown'}`);
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

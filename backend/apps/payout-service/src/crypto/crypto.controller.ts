// apps/payout-service/src/crypto/crypto.controller.ts
// PS-10 + PS-11: Crypto wallet endpoints
// PS-10: walletconnect-session POST/GET
// PS-11: providers list, provider/:name info, rejection handler

import { Controller, Post, Get, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { CryptoConnectionService } from './crypto-connection.service';
import { JwtAuthGuard }            from '../guards/jwt-auth.guard';
import { CryptoProvider }          from '../entities/deposit-method.entity';

@Controller('v1/deposit-methods/crypto')
@UseGuards(JwtAuthGuard)
export class CryptoController {
  constructor(private readonly cryptoSvc: CryptoConnectionService) {}

  // ─── PS-11: GET /providers — list all 9 providers with capabilities ──
  @Get('providers')
  @HttpCode(200)
  async listProviders() {
    return { providers: this.cryptoSvc.getAllProviders() };
  }

  // ─── PS-11: GET /providers/:provider — single provider info ──
  @Get('providers/:provider')
  @HttpCode(200)
  async getProvider(@Param('provider') provider: string) {
    const upper = provider.toUpperCase() as CryptoProvider;
    if (!Object.values(CryptoProvider).includes(upper)) {
      return { statusCode: 404, message: `Provider ${provider} not found.` };
    }
    return this.cryptoSvc.getProviderInfo(upper);
  }

  // ─── PS-10: POST /walletconnect-session ──
  @Post('walletconnect-session')
  @HttpCode(201)
  async createSession(@Request() req: any, @Body() dto: { cryptoProvider: string; network: string }) {
    return this.cryptoSvc.createWalletConnectSession(req.user.userId, dto);
  }

  // ─── PS-10: GET /walletconnect-session/:id ──
  @Get('walletconnect-session/:id')
  @HttpCode(200)
  async pollSession(@Param('id') id: string) {
    return this.cryptoSvc.getWalletConnectSession(id);
  }

  // ─── PS-11 §11: POST /walletconnect-session/:id/reject ──
  @Post('walletconnect-session/:id/reject')
  @HttpCode(200)
  async rejectSession(@Param('id') id: string) {
    await this.cryptoSvc.handleWalletConnectRejection(id);
    return { status: 'rejected' };
  }
}
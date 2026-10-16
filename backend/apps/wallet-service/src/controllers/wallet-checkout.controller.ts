import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { WalletService } from '../services/wallet.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ownerFromToken, RequestUser } from '../guards/wallet-owner';

// Spends wallet balance. The user id comes from the verified token: this
// route previously took it from the request body, so any logged-in user
// could spend another user's balance.
@Controller('wallet/checkout')
@UseGuards(JwtAuthGuard)
export class WalletCheckoutController {
  constructor(private readonly walletService: WalletService) {}

  @Post('use-wallet')
  async useWallet(
    @Body() body: { userId: string; walletBalanceUsed: number },
    @Req() req: Request,
  ) {
    const userId = ownerFromToken(
      (req as any).user as RequestUser,
      body.userId,
      'POST /wallet/checkout/use-wallet',
    );
    return this.walletService.useWalletBalance({ ...body, userId });
  } // implemented logic in wallet.service.ts
}

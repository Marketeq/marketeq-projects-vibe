import { Controller, Post, Body } from '@nestjs/common';
import { WalletService } from '../services/wallet.service';

@Controller('wallet/checkout')
export class WalletCheckoutController {
  constructor(private readonly walletService: WalletService) {}

  @Post('use-wallet')
  async useWallet(@Body() body: { userId: string; walletBalanceUsed: number }) {
    return this.walletService.useWalletBalance(body);
  } // implemented logic in wallet.service.ts
}

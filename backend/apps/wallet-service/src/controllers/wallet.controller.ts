import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { WalletService } from '../services/wallet.service';
import { ApplyGiftCardDto } from '../dto/apply-giftcard.dto';
import { WalletTopUpDto } from '../dto/wallet-topup.dto';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('apply-giftcard')
  async applyGiftCard(@Body() dto: ApplyGiftCardDto) {
    return this.walletService.applyGiftCard(dto);
  }

  @Post('topup-intent')
  async createTopUpIntent(@Body() dto: WalletTopUpDto) {
    return this.walletService.createWalletTopUpIntent(dto);
  }

  @Get(':userId/balance')
async getBalance(@Param('userId') userId: string) {
  const wallet = await this.walletService.getBalance(userId);
  return { userId, balance: wallet };
}
}
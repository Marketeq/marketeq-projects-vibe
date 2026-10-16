import { Controller, Post, Body, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { WalletService } from '../services/wallet.service';
import { ApplyGiftCardDto } from '../dto/apply-giftcard.dto';
import { WalletTopUpDto } from '../dto/wallet-topup.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { assertOwner, ownerFromToken, RequestUser } from '../guards/wallet-owner';

// Every route here acts on money. The user id now comes from the verified
// token, never from the request: these endpoints previously accepted any
// userId from the caller, so any logged-in user could read or spend another
// user's wallet.
@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('apply-giftcard')
  async applyGiftCard(@Body() dto: ApplyGiftCardDto, @Req() req: Request) {
    const userId = ownerFromToken(
      (req as any).user as RequestUser,
      dto.userId,
      'POST /wallet/apply-giftcard',
    );
    return this.walletService.applyGiftCard({ ...dto, userId });
  }

  @Post('topup-intent')
  async createTopUpIntent(@Body() dto: WalletTopUpDto, @Req() req: Request) {
    const userId = ownerFromToken(
      (req as any).user as RequestUser,
      dto.userId,
      'POST /wallet/topup-intent',
    );
    return this.walletService.createWalletTopUpIntent({ ...dto, userId });
  }

  @Get(':userId/balance')
  async getBalance(@Param('userId') userId: string, @Req() req: Request) {
    const ownerId = assertOwner(
      (req as any).user as RequestUser,
      userId,
      'GET /wallet/:userId/balance',
    );
    const wallet = await this.walletService.getBalance(ownerId);
    return { userId: ownerId, balance: wallet };
  }
}

import {
  Controller, Get, Param, Query, UseGuards, HttpCode,
  ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ServiceAuthGuard }  from '../guards/service-auth.guard';
import { BalanceService }    from '../balance/balance.service';
import { EarningsService }   from '../earnings/earnings.service';

@Controller('internal/earnings')
@UseGuards(ServiceAuthGuard)
export class InternalController {
  constructor(
    private readonly balanceSvc:  BalanceService,
    private readonly earningsSvc: EarningsService,
  ) {}

  @Get('balance/:userId')
  @HttpCode(200)
  async getBalance(@Param('userId', ParseUUIDPipe) userId: string) {
    const snap = await this.balanceSvc.getBalanceRaw(userId);
    if (!snap) {
      return {
        userId,
        availableBalance: '0.00', reserveBalance: '0.00',
        pendingHoldUsd:   '0.00', totalEarnedUsd: '0.00',
        displayCurrency:  'USD',  localCurrency:  'USD',
        lastUpdatedAt: new Date().toISOString(),
      };
    }
    return {
      userId,
      availableBalance: snap.availableBalance,
      reserveBalance:  '0.00',
      pendingHoldUsd:  snap.pendingHoldUsd,
      totalEarnedUsd:  snap.totalEarnedUsd,
      displayCurrency: snap.displayCurrency,
      localCurrency:   snap.localCurrency,
      lastUpdatedAt:   snap.updatedAt.toISOString(),
    };
  }

  @Get('ytd/:userId')
  @HttpCode(200)
  async getYtd(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('year', new DefaultValuePipe(new Date().getUTCFullYear()), ParseIntPipe)
    year: number,
  ) {
    return this.earningsSvc.getYtd(userId, year);
  }
}

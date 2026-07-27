import { Controller, Get, UseGuards, HttpCode, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { BalanceService }      from './balance.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../guards/current-user.decorator';
import { BalanceResponseDto }  from './dto/balance-response.dto';
import { CreateBalanceDto } from './dto/create-balance.dto';
import { GeoService } from '../geo/geo.service';

@Controller('earnings')
@UseGuards(JwtAuthGuard)
export class BalanceController {
  constructor(private readonly svc: BalanceService, private readonly geo: GeoService) {}

  @Get('balance')
  @HttpCode(200)
  async getBalance(@CurrentUser() user: any, @Req() req: Request): Promise<BalanceResponseDto> {
    const { currency, fallback } = await this.geo.resolveTalentCurrency(user.id, this.geo.extractClientIp(req));
    const result = await this.svc.getBalance(user.id, currency, currency);
    return { ...result, currencyFallback: fallback };
  }

  @Post('balance')
  @HttpCode(201)
  async createBalance(@Body() dto: CreateBalanceDto) {
    return this.svc.createBalance(dto);
  }
}

import {
  Controller, Get, Query, Param, Post, Body, Req,
  UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { EarningsService }  from './earnings.service';
import { EarningsQueryDto } from './dto/earnings-query.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../guards/current-user.decorator';
import { GeoService } from '../geo/geo.service';

@Controller('earnings')
@UseGuards(JwtAuthGuard)
export class EarningsController {
  constructor(private readonly svc: EarningsService, private readonly geo: GeoService) {}

  @Get('summary')
  @HttpCode(200)
  async getSummary(@CurrentUser() user: any, @Req() req: Request, @Query('timezone') timezone?: string) {
    const { currency, fallback } = await this.geo.resolveTalentCurrency(user.id, this.geo.extractClientIp(req));
    const result = await this.svc.getSummary(user.id, timezone || 'UTC', currency);
    return { ...result, currencyFallback: fallback };
  }

  @Post()
  @HttpCode(201)
  async createEarning(@Body() dto: any) {
    return this.svc.createEarning(dto);
  }

  @Get()
  @HttpCode(200)
  async getEarnings(@CurrentUser() user: any, @Req() req: Request, @Query() query: EarningsQueryDto) {
    const { currency, fallback } = await this.geo.resolveTalentCurrency(user.id, this.geo.extractClientIp(req));
    const result = await this.svc.getEarnings(user.id, query, currency);
    return { ...result, currencyFallback: fallback };
  }

  @Get(':id')
  @HttpCode(200)
  async getDetail(@CurrentUser() user: any, @Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const { currency, fallback } = await this.geo.resolveTalentCurrency(user.id, this.geo.extractClientIp(req));
    const result = await this.svc.getDetail(user.id, id, currency);
    return { ...result, currencyFallback: fallback };
  }
}

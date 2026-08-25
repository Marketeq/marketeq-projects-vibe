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
import { AblyService } from '../publishers/ably.service';

@Controller('earnings')
@UseGuards(JwtAuthGuard)
export class EarningsController {
  constructor(
    private readonly svc: EarningsService,
    private readonly geo: GeoService,
    private readonly ably: AblyService,
  ) {}

  // US-91–94: Ably token scoped to this contractor's own
  // private:{contractorId}:earnings channel, subscribe-only.
  @Get('ably-token')
  @HttpCode(200)
  async getAblyToken(@CurrentUser() user: any) {
    return this.ably.createTokenRequest(user.id);
  }

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

  // Distinct project/client options for the "All Projects"/"All Clients"
  // filter dropdowns — sourced from the contractor's full contract history,
  // not from whatever earnings rows the current date-range filter returns.
  // Must be registered before ':id' — otherwise "filters" would be parsed
  // as an :id UUID param and 400.
  @Get('filters')
  @HttpCode(200)
  async getFilterOptions(@CurrentUser() user: any) {
    return this.svc.getFilterOptions(user.id);
  }

  @Get(':id')
  @HttpCode(200)
  async getDetail(@CurrentUser() user: any, @Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const { currency, fallback } = await this.geo.resolveTalentCurrency(user.id, this.geo.extractClientIp(req));
    const result = await this.svc.getDetail(user.id, id, currency);
    return { ...result, currencyFallback: fallback };
  }
}

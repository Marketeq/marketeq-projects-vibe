import {
  Controller, Get, Query, Param, Post, Body,
  UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { EarningsService }  from './earnings.service';
import { EarningsQueryDto } from './dto/earnings-query.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../guards/current-user.decorator';

@Controller('earnings')
@UseGuards(JwtAuthGuard)
export class EarningsController {
  constructor(private readonly svc: EarningsService) {}

  @Get('summary')
  @HttpCode(200)
  async getSummary(@CurrentUser() user: any, @Query('timezone') timezone?: string) {
    return this.svc.getSummary(user.id, timezone || 'UTC', 'USD');
  }

  @Post()
  @HttpCode(201)
  async createEarning(@Body() dto: any) {
    return this.svc.createEarning(dto);
  }

  @Get()
  @HttpCode(200)
  async getEarnings(@CurrentUser() user: any, @Query() query: EarningsQueryDto) {
    return this.svc.getEarnings(user.id, query, 'USD');
  }

  @Get(':id')
  @HttpCode(200)
  async getDetail(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getDetail(user.id, id, 'USD');
  }
}

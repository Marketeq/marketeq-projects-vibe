import { Controller, Get, UseGuards, HttpCode, Post, Body } from '@nestjs/common';
import { BalanceService }      from './balance.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../guards/current-user.decorator';
import { BalanceResponseDto }  from './dto/balance-response.dto';
import { CreateBalanceDto } from './dto/create-balance.dto';

@Controller('earnings')
@UseGuards(JwtAuthGuard)
export class BalanceController {
  constructor(private readonly svc: BalanceService) {}

  @Get('balance')
  @HttpCode(200)
  async getBalance(@CurrentUser() user: any): Promise<BalanceResponseDto> {
    return this.svc.getBalance(user.id, 'USD', 'USD');
  }

  @Post('balance')
  @HttpCode(201)
  async createBalance(@Body() dto: CreateBalanceDto) {
    return this.svc.createBalance(dto);
  }
}

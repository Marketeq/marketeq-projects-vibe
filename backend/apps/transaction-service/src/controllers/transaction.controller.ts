import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common'
import { TransactionService } from '../services/transaction.service'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { TransactionFilterDto } from '../dto/filter.dto'
import { ProblemReportDto } from '../dto/problem-report.dto'

@Controller('v1/transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly svc: TransactionService) {}

  @Get()
  list(@Req() req: any, @Query() filter: TransactionFilterDto) {
    return this.svc.findAll(req.user.userId, filter)
  }

  @Get(':id')
  detail(@Req() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.userId, id)
  }

  @Post(':id/problem')
  @HttpCode(HttpStatus.OK)
  reportProblem(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ProblemReportDto,
  ) {
    return this.svc.reportProblem(req.user.userId, id, dto)
  }
}

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { InternalJwtGuard } from '../../guards/internal-jwt.guard';
import { BudgetService } from '../services/budget.service';
import { CalculateBudgetDto } from '../dto/calculate-budget.dto';

@UseGuards(InternalJwtGuard)
@Controller('v1/budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post('calculate')
  calculate(@Body() dto: CalculateBudgetDto) {
    return this.budgetService.calculate(dto);
  }
}

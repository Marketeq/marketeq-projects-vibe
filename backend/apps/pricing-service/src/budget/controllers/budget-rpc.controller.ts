import { Controller, ValidationPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { BudgetService } from '../services/budget.service';
import { CalculateBudgetDto } from '../dto/calculate-budget.dto';

@Controller()
export class BudgetRpcController {
  constructor(private readonly budgetService: BudgetService) {}

  @MessagePattern('budget.calculate')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new RpcException({
          statusCode: 400,
          message: errors
            .flatMap((error) => Object.values(error.constraints ?? {}))
            .join(', '),
        }),
    }),
  )
  async calculate(@Payload() dto: CalculateBudgetDto) {
    try {
      return await this.budgetService.calculate(dto);
    } catch (err) {
      throw new RpcException({
        statusCode: 500,
        message: err instanceof Error ? err.message : 'Unexpected error',
      });
    }
  }
}

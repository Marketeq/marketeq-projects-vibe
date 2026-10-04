import {
  Controller,
  ValidationPipe,
  ValidationError,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { BudgetService } from '../services/budget.service';
import { CalculateBudgetDto } from '../dto/calculate-budget.dto';
import { PriceScopeDto } from '../dto/price-scope.dto';
import { ScopePriceService } from '../services/scope-price.service';

const collectMessages = (errors: ValidationError[]): string[] =>
  errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...collectMessages(error.children ?? []),
  ]);

@Controller()
export class BudgetRpcController {
  constructor(
    private readonly budgetService: BudgetService,
    private readonly scopePriceService: ScopePriceService,
  ) {}

  @MessagePattern('budget.calculate')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new RpcException({
          statusCode: 400,
          message: collectMessages(errors).join(', '),
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

  @MessagePattern('scope.price')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new RpcException({
          statusCode: 400,
          message: collectMessages(errors).join(', '),
        }),
    }),
  )
  async priceScope(@Payload() dto: PriceScopeDto) {
    try {
      return await this.scopePriceService.price(dto);
    } catch (err) {
      if (err instanceof RpcException) throw err;
      throw new RpcException({
        statusCode: 500,
        message: err instanceof Error ? err.message : 'Unexpected error',
      });
    }
  }
}

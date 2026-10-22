import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BudgetController } from './controllers/budget.controller';
import { BudgetRpcController } from './controllers/budget-rpc.controller';
import { BudgetService } from './services/budget.service';
import { ScopePriceService } from './services/scope-price.service';
import { RatesModule } from '../rates/rates.module';

@Module({
  imports: [
    ConfigModule,
    RatesModule,
  ],
  controllers: [BudgetController, BudgetRpcController],
  providers: [BudgetService, ScopePriceService],
})
export class BudgetModule {}

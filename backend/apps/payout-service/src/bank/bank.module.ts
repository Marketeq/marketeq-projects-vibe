// apps/payout-service/src/bank/bank.module.ts
// Stripe Connect bank payout execution module
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankPayoutExecutorService } from './bank-payout-executor.service';
import { PayoutRequest } from '../entities/payout-request.entity';
import { DepositMethod } from '../entities/deposit-method.entity';
import { PublishersModule } from '../publishers/publishers.module';
import { ExecutionModule } from '../execution/execution.module';
import { FeesModule } from '../fees/fees.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayoutRequest, DepositMethod]),
    PublishersModule,
    ExecutionModule,   // WisePlatformService
    FeesModule,        // PayoutFeeService
  ],
  providers: [BankPayoutExecutorService],
  exports: [BankPayoutExecutorService],
})
export class BankModule {}

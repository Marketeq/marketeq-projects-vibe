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
import { OAuthModule } from '../oauth/oauth.module';

import { IdentityGateModule } from '../identity-gate/identity-gate.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayoutRequest, DepositMethod]),
    PublishersModule,
    ExecutionModule,   // WisePlatformService
    FeesModule,        // PayoutFeeService
    OAuthModule,       // OAuthService.ensureFreshToken — PS-09 v2.0 §11
    IdentityGateModule, // G9 PayoutExecutionGate
  ],
  providers: [BankPayoutExecutorService],
  exports: [BankPayoutExecutorService],
})
export class BankModule {}

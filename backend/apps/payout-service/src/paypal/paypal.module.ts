// apps/payout-service/src/paypal/paypal.module.ts
// PayPal Payouts API execution module
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaypalPayoutExecutorService } from './paypal-payout-executor.service';
import { PaypalReconciliationCron } from './paypal-reconciliation.cron';
import { PayoutRequest } from '../entities/payout-request.entity';
import { DepositMethod } from '../entities/deposit-method.entity';
import { PublishersModule } from '../publishers/publishers.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayoutRequest, DepositMethod]),
    PublishersModule,
    ProvidersModule, // PaypalProvider
  ],
  providers: [PaypalPayoutExecutorService, PaypalReconciliationCron],
  exports: [PaypalPayoutExecutorService],
})
export class PaypalModule {}

// apps/payout-service/src/execution/execution.module.ts
// PS-12: Crypto payout settlement execution module
import { Module }                       from '@nestjs/common';
import { TypeOrmModule }                from '@nestjs/typeorm';
import { BridgeSelectorService }        from './bridge-selector.service';
import { GasEstimatorService }          from './gas-estimator.service';
import { CryptoRetryService }           from './crypto-retry.service';
import { CryptoMinimumService }         from './crypto-minimum.service';
import { CryptoPayoutExecutorService }  from './crypto-payout-executor.service';
import { PayoutRequest }                from '../entities/payout-request.entity';
import { DepositMethod }                from '../entities/deposit-method.entity';
import { CryptoModule }                 from '../crypto/crypto.module';
import { ProvidersModule }              from '../providers/providers.module';
import { PublishersModule }             from '../publishers/publishers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayoutRequest, DepositMethod]),
    CryptoModule,       // ConversionService
    ProvidersModule,    // CryptoPayoutProvider
    PublishersModule,   // PayoutPublisher
  ],
  providers: [
    BridgeSelectorService,
    GasEstimatorService,
    CryptoRetryService,
    CryptoMinimumService,
    CryptoPayoutExecutorService,
  ],
  exports: [
    BridgeSelectorService,
    GasEstimatorService,
    CryptoRetryService,
    CryptoMinimumService,
    CryptoPayoutExecutorService,
  ],
})
export class ExecutionModule {}
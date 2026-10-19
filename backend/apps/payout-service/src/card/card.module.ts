// apps/payout-service/src/card/card.module.ts
// PS-13: Marketeq Debit Card module
import { Module }                     from '@nestjs/common';
import { TypeOrmModule }              from '@nestjs/typeorm';
import { CardIssuanceService }        from './card-issuance.service';
import { CardPayoutExecutorService }  from './card-payout-executor.service';
import { CardController }             from './card.controller';
import { DepositMethod }              from '../entities/deposit-method.entity';
import { PayoutRequest }              from '../entities/payout-request.entity';
import { CommonModule }               from '../common/common.module';
import { PublishersModule }           from '../publishers/publishers.module';

import { IdentityGateModule } from '../identity-gate/identity-gate.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DepositMethod, PayoutRequest]),
    CommonModule,    // KycClient
    PublishersModule, // PayoutPublisher
    IdentityGateModule, // G9 PayoutExecutionGate
  ],
  controllers: [CardController],
  providers: [CardIssuanceService, CardPayoutExecutorService],
  exports: [CardIssuanceService, CardPayoutExecutorService],
})
export class CardModule {}
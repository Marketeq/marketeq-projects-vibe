// apps/payout-service/src/kyc/kyc.module.ts
// PS-15: KYC-Identity Gating module
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycGateService } from './kyc-gate.service';
import { EddService } from './edd.service';
import { PayoutRequest } from '../entities/payout-request.entity';
import { DepositMethod } from '../entities/deposit-method.entity';
import { FirstPayoutHold } from '../entities/first-payout-hold.entity';
import { CommonModule } from '../common/common.module';
import { PublishersModule } from '../publishers/publishers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayoutRequest, DepositMethod, FirstPayoutHold]),
    CommonModule,       // KycClient
    PublishersModule,   // PayoutPublisher (for EDD events)
  ],
  providers: [KycGateService, EddService],
  exports: [KycGateService, EddService],
})
export class KycModule {}
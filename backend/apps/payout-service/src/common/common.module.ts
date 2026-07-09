// apps/payout-service/src/common/common.module.ts
// PS-00 §3.1: Upstream dependency clients — earnings-service, kyc-identity-service
// @Global so every module can inject EarningsClient and KycClient without importing
import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EarningsClient } from './earnings.client';
import { KycClient } from './kyc.client';

@Global()
@Module({
  imports: [HttpModule],
  providers: [EarningsClient, KycClient],
  exports: [EarningsClient, KycClient],
})
export class CommonModule {}
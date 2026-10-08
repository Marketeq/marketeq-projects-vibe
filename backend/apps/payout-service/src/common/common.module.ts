// apps/payout-service/src/common/common.module.ts
// PS-00 §3.1: Upstream dependency clients — earnings-service, kyc-identity-service
// @Global so every module can inject EarningsClient and KycClient without importing
import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EarningsClient } from './earnings.client';
import { KycClient } from './kyc.client';
import { IdentityServiceClient } from './identity.client';
import { UserClient } from './user.client';

@Global()
@Module({
  imports: [HttpModule],
  providers: [EarningsClient, KycClient, IdentityServiceClient, UserClient],
  exports: [EarningsClient, KycClient, IdentityServiceClient, UserClient],
})
export class CommonModule {}
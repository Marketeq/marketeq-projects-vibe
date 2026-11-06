import { Global, Module } from '@nestjs/common';
import { ContractPartiesClient } from './contract-parties.client';
import { ContractAccessService } from './contract-access.service';

@Global()
@Module({
  providers: [ContractPartiesClient, ContractAccessService],
  exports: [ContractAccessService, ContractPartiesClient],
})
export class ContractsModule {}

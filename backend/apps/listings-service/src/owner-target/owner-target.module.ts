import { Module } from '@nestjs/common';
import { RelationalProjectPersistenceModule } from '../publish/infrastructure/persistence/relational/relational-persistence.module';
import { OwnerTargetGrpcController } from './owner-target-grpc.controller';
import { OwnerTargetListingsService } from './owner-target-listings.service';

@Module({
  imports: [RelationalProjectPersistenceModule],
  controllers: [OwnerTargetGrpcController],
  providers: [OwnerTargetListingsService],
})
export class OwnerTargetGrpcModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HireRequests } from './hire-requests.entity';
import { HireRequestsService } from './hire-requests.service';
import { HireRequestsController } from './hire-requests.controller';
import { User } from '../user/entities/user.entity';
import { IdentityGateModule } from '../identity-gate/identity-gate.module';
import { HireRequestGate } from './hire-request-gate';

@Module({
  imports: [TypeOrmModule.forFeature([HireRequests, User]), IdentityGateModule],
  controllers: [HireRequestsController],
  providers: [HireRequestsService, HireRequestGate],
  exports: [HireRequestsService],
})
export class HireRequestsModule {}

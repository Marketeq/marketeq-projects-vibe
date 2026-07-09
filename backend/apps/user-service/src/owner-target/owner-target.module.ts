import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamMember } from '../teams/teams.entity';
import { User } from '../user/entities/user.entity';
import { OwnerTargetGrpcController } from './owner-target-grpc.controller';
import { OwnerTargetValidationService } from './owner-target-validation.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeamMember, User])],
  controllers: [OwnerTargetGrpcController],
  providers: [OwnerTargetValidationService],
})
export class OwnerTargetModule {}

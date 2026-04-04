import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { TeamsInternalController } from './teams-internal.controller';
import { TeamMember } from './teams.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TeamMember, User])],
  controllers: [TeamsController, TeamsInternalController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}

import { Module } from '@nestjs/common';
import { AffiliatedTeamService } from './affiliated-teams.service';
import { AffiliatedTeam } from './affiliated-teams.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AffiliatedTeamController } from './affiliated-teams.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AffiliatedTeam])],
  controllers: [AffiliatedTeamController],
  providers: [AffiliatedTeamService],
  exports: [AffiliatedTeamService],
})
export class AffiliatedTeamModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TeamsInternalController } from './teams-internal.controller';
import { TeamsController } from './team.controller';
import { TeamsService } from './team.service';
import { Team } from './entities/team.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Team]), ConfigModule],
  controllers: [TeamsController, TeamsInternalController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}

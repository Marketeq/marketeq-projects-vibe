import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { AffiliatedTeamsController } from './affiliated-teams.controller';
import { TeamsController } from './teams.controller';

@Module({
  imports: [GatewayHttpModule],
  controllers: [TeamsController,AffiliatedTeamsController],  
})
export class TeamsModule {}
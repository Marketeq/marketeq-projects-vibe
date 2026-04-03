import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { InvitationsController } from './invitations.controller';

@Module({
  imports: [GatewayHttpModule],
  controllers: [InvitationsController],
})
export class InvitationsModule {}

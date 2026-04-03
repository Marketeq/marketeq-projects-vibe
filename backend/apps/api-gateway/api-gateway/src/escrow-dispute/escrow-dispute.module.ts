import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { EscrowDisputeController } from './escrow-dispute.controller';

@Module({
  imports: [GatewayHttpModule], // Using GatewayHttpModule to make HTTP requests to the User Service
  controllers: [EscrowDisputeController],
})
export class EscrowDisputeModule {}

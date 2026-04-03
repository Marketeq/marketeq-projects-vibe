import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { ContractsController } from './contracts.controller';

@Module({
  imports: [GatewayHttpModule], // Using GatewayHttpModule to make HTTP requests to the User Service
  controllers: [ContractsController],
})
export class ContractsModule {}

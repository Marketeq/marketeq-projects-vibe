import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { OrderController } from './order.controller';

@Module({
  imports: [GatewayHttpModule], // Using GatewayHttpModule to make HTTP requests to the User Service
  controllers: [OrderController],
})
export class OrderModule {}

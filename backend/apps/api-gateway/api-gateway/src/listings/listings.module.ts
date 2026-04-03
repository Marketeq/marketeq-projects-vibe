import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { ListingsController } from './listings.controller';

@Module({
  imports: [GatewayHttpModule],
  controllers: [ListingsController],
})
export class ListingsModule {}

import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { AiRecommController } from './ai-recomm.controller';

@Module({
  imports: [GatewayHttpModule], // Using GatewayHttpModule to make HTTP requests to the User Service
  controllers: [AiRecommController],
})
export class AiRecommModule {}

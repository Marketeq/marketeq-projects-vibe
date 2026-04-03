import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { WireReviewController } from './wire-review.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GatewayHttpModule.register({ timeout: 5000 }),
  ],
  controllers: [WireReviewController],
})
export class WireAppModule {}
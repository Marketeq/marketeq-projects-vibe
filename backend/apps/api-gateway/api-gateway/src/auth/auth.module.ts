import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { AuthController } from './auth.controller';

@Module({
  imports: [GatewayHttpModule],
  controllers: [AuthController],
})
export class AuthModule {}

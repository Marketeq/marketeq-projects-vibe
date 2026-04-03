import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { WorkTrackingController } from './work-tracking.controller';

@Module({
  imports: [GatewayHttpModule], // Using GatewayHttpModule to make HTTP requests to the User Service
  controllers: [WorkTrackingController],
})
export class WorkTrackingModule {}

import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { MessagingNotificationController } from './messaging-notification.controller';

@Module({
  imports: [GatewayHttpModule], // Using GatewayHttpModule to make HTTP requests to the User Service
  controllers: [MessagingNotificationController],
})
export class MessagingNotificationModule {}

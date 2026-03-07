import { Module } from '@nestjs/common';
import { UapiUgatewayController } from './api-gateway.controller';
import { UapiUgatewayService } from './api-gateway.service';

@Module({
  imports: [],
  controllers: [UapiUgatewayController],
  providers: [UapiUgatewayService],
})
export class UapiUgatewayModule {}

import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { TalentController } from './talent.controller';

@Module({
  imports: [GatewayHttpModule],
  controllers: [TalentController],
})
export class TalentModule {}

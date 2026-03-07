import { Module } from '@nestjs/common';
import { UauthUserviceController } from './auth-service.controller';
import { UauthUserviceService } from './auth-service.service';

@Module({
  imports: [],
  controllers: [UauthUserviceController],
  providers: [UauthUserviceService],
})
export class UauthUserviceModule {}

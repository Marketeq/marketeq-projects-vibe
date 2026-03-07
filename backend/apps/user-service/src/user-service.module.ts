import { Module } from '@nestjs/common';
import { UuserUserviceController } from './user-service.controller';
import { UuserUserviceService } from './user-service.service';

@Module({
  imports: [],
  controllers: [UuserUserviceController],
  providers: [UuserUserviceService],
})
export class UuserUserviceModule {}

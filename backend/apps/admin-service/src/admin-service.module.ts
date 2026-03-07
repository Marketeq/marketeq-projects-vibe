import { Module } from '@nestjs/common';
import { UadminUserviceController } from './admin-service.controller';
import { UadminUserviceService } from './admin-service.service';

@Module({
  imports: [],
  controllers: [UadminUserviceController],
  providers: [UadminUserviceService],
})
export class UadminUserviceModule {}

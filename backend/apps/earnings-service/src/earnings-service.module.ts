import { Module } from '@nestjs/common';
import { UearningsUserviceController } from './earnings-service.controller';
import { UearningsUserviceService } from './earnings-service.service';

@Module({
  imports: [],
  controllers: [UearningsUserviceController],
  providers: [UearningsUserviceService],
})
export class UearningsUserviceModule {}

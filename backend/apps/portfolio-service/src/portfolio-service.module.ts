import { Module } from '@nestjs/common';
import { UportfolioUserviceController } from './portfolio-service.controller';
import { UportfolioUserviceService } from './portfolio-service.service';

@Module({
  imports: [],
  controllers: [UportfolioUserviceController],
  providers: [UportfolioUserviceService],
})
export class UportfolioUserviceModule {}

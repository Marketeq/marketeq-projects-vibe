import { Module } from '@nestjs/common';
import { UalgoliaUserviceController } from './algolia-service.controller';
import { UalgoliaUserviceService } from './algolia-service.service';

@Module({
  imports: [],
  controllers: [UalgoliaUserviceController],
  providers: [UalgoliaUserviceService],
})
export class UalgoliaUserviceModule {}

import { Module } from '@nestjs/common';
import { UsearchUserviceController } from './search-service.controller';
import { UsearchUserviceService } from './search-service.service';

@Module({
  imports: [],
  controllers: [UsearchUserviceController],
  providers: [UsearchUserviceService],
})
export class UsearchUserviceModule {}

import { Module } from '@nestjs/common';
import { UsuggestionsUserviceController } from './suggestions-service.controller';
import { UsuggestionsUserviceService } from './suggestions-service.service';

@Module({
  imports: [],
  controllers: [UsuggestionsUserviceController],
  providers: [UsuggestionsUserviceService],
})
export class UsuggestionsUserviceModule {}

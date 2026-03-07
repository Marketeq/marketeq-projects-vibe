import { Module } from '@nestjs/common';
import { UautocompleteUserviceController } from './autocomplete-service.controller';
import { UautocompleteUserviceService } from './autocomplete-service.service';

@Module({
  imports: [],
  controllers: [UautocompleteUserviceController],
  providers: [UautocompleteUserviceService],
})
export class UautocompleteUserviceModule {}

import { Module } from '@nestjs/common';
import { UfavoritesUserviceController } from './favorites-service.controller';
import { UfavoritesUserviceService } from './favorites-service.service';

@Module({
  imports: [],
  controllers: [UfavoritesUserviceController],
  providers: [UfavoritesUserviceService],
})
export class UfavoritesUserviceModule {}

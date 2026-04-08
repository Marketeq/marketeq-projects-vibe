import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HomepageController } from './homepage.controller';
import { HomepageService } from './homepage.service';

@Module({
  imports: [HttpModule.register({ timeout: 10000 })],
  controllers: [HomepageController],
  providers: [HomepageService],
  exports: [HomepageService],
})
export class HomepageModule {}

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HomepageController } from './homepage.controller';
import { HomepageService } from './homepage.service';
import { HomepageConsumer } from './homepage.consumer';

@Module({
  imports: [HttpModule.register({ timeout: 10000 })],
  controllers: [HomepageController],
  providers: [HomepageService, HomepageConsumer],
  exports: [HomepageService],
})
export class HomepageModule {}

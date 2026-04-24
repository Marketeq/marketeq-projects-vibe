import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HomepageController } from './homepage.controller';
import { HomepageService } from './homepage.service';
import { HomepageConsumer } from './homepage.consumer';
import { ProjectsConsumer } from './projects.consumer';

@Module({
  imports: [HttpModule.register({ timeout: 10000 })],
  // Both consumers' @EventPattern handlers only fire when the class is
  // registered as a controller — Nest only routes microservice messages
  // through the controllers array.
  controllers: [HomepageController, HomepageConsumer, ProjectsConsumer],
  providers: [HomepageService],
  exports: [HomepageService],
})
export class HomepageModule {}

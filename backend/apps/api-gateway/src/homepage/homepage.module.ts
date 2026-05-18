import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { HomepageController } from './homepage.controller';
import { HomepageService } from './homepage.service';
import { HomepageConsumer } from './homepage.consumer';
import { ProjectsConsumer } from './projects.consumer';
import { HomepageBackfillService } from './homepage-backfill.service';
import { HomepageEntity } from './entities/homepage.entity';
import { HomepageBannerEntity } from './entities/homepage-banner.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([HomepageEntity, HomepageBannerEntity]),
    HttpModule.register({ timeout: 10000 }),
  ],
  // Both consumers' @EventPattern handlers only fire when the class is
  // registered as a controller — Nest only routes microservice messages
  // through the controllers array.
  controllers: [HomepageController, HomepageConsumer, ProjectsConsumer],
  providers: [HomepageService, HomepageBackfillService],
  exports: [HomepageService],
})
export class HomepageModule {}

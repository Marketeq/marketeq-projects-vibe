import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecentlyViewed } from './recently-viewed.entity';
import { RecentlyViewedController } from './recently-viewed.controller';
import { RecentlyViewedService } from './recently-viewed.service';
import { Project } from '../projects/entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RecentlyViewed, Project])],
  controllers: [RecentlyViewedController],
  providers: [RecentlyViewedService],
  exports: [RecentlyViewedService],
})
export class RecentlyViewedModule {}

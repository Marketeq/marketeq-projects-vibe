import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogPost } from './entities/blog-post.entity';
import { BlogController } from './blog.controller';
import { BlogConsumer } from './blog.consumer';
import { BlogBackfillService } from './blog-backfill.service';

@Module({
  imports: [TypeOrmModule.forFeature([BlogPost])],
  controllers: [BlogController, BlogConsumer],
  providers: [BlogBackfillService],
})
export class BlogModule {}

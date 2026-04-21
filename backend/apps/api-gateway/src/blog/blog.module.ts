import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';

@Module({
  imports: [HttpModule.register({ timeout: 10000 })],
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}


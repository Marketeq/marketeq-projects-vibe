import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost } from './entities/blog-post.entity';

@Controller('blog-posts')
export class BlogController {
  constructor(
    @InjectRepository(BlogPost)
    private readonly blogRepo: Repository<BlogPost>,
  ) {}

  @Get()
  async getBlogPosts(@Query('status') status?: string) {
    const whereCondition = status ? { status } : { status: 'published' };
    const posts = await this.blogRepo.find({
      where: whereCondition,
      order: { publishedAt: 'DESC' },
    });
    return { docs: posts };
  }
}

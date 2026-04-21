import { Controller, Get, Param, Query } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogPostDetail, BlogPostListResponse } from './blog.types';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  /**
   * GET /blog/posts
   *
   * Public endpoint. Returns published blog posts from cms-service.
   */
  @Get('posts')
  async listPosts(
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('categorySlug') categorySlug?: string,
  ): Promise<BlogPostListResponse> {
    const page = Math.max(1, Number(pageRaw ?? 1) || 1);
    const limit = Math.min(50, Math.max(1, Number(limitRaw ?? 12) || 12));
    return this.blogService.listPosts({ page, limit, categorySlug });
  }

  /**
   * GET /blog/posts/:slug
   *
   * Public endpoint. Returns a single published blog post by slug.
   */
  @Get('posts/:slug')
  async getPost(@Param('slug') slug: string): Promise<BlogPostDetail> {
    return this.blogService.getPostBySlug(slug);
  }
}


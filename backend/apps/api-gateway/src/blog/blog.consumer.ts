import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost } from './entities/blog-post.entity';

@Controller()
export class BlogConsumer {
  private readonly logger = new Logger(BlogConsumer.name);

  constructor(
    @InjectRepository(BlogPost)
    private readonly blogRepo: Repository<BlogPost>,
  ) {}

  @EventPattern('blog-post.saved')
  async onBlogPostSaved(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      const existing = await this.blogRepo.findOne({ where: { payloadId: data.id } });
      const payload = {
        payloadId: data.id,
        slug: data.slug,
        title: data.title,
        body: data.body,
        authorId: data.authorId,
        coverImageUrl: data.coverImageUrl,
        status: data.status,
        publishedAt: data.publishedAt,
      };
      
      if (existing) {
        await this.blogRepo.update(existing.id, payload);
        this.logger.log(`Updated blog post: ${data.slug}`);
      } else {
        await this.blogRepo.save(this.blogRepo.create(payload));
        this.logger.log(`Created new blog post: ${data.slug}`);
      }
      channel.ack(message);
    } catch (err) {
      this.logger.error(`Blog sync failed: ${err.message}`);
      channel.nack(message, false, true);
    }
  }

  @EventPattern('blog-post.deleted')
  async onBlogPostDeleted(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      const existing = await this.blogRepo.findOne({ where: { payloadId: data.id } });
      if (existing) {
        await this.blogRepo.remove(existing);
        this.logger.log(`Deleted blog post: ${existing.slug}`);
      }
      channel.ack(message);
    } catch (err) {
      this.logger.error(`Blog deletion failed: ${err.message}`);
      channel.nack(message, false, true);
    }
  }
}

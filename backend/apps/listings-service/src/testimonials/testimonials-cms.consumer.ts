import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { TestimonialsService } from './testimonials.service';

@Controller()
export class TestimonialsCmsConsumer {
  private readonly logger = new Logger(TestimonialsCmsConsumer.name);

  constructor(private readonly testimonialsService: TestimonialsService) {}

  @EventPattern('testimonial.saved')
  async onTestimonialSaved(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      if (data.sourceId === 'listings-service') {
        channel.ack(message);
        return;
      }

      this.logger.log(`Received testimonial.saved for author: ${data.authorName}`);
      await this.testimonialsService.upsert({
        payloadId: data.id,
        authorName: data.authorName,
        authorTitle: data.authorTitle,
        authorCompany: data.authorCompany,
        avatarUrl: data.avatarUrl,
        quote: data.quote,
        rating: data.rating,
        featured: data.featured,
        status: data.status,
        sourceId: data.sourceId || 'cms-service',
      });
      channel.ack(message);
    } catch (err) {
      this.logger.error(`Failed to handle testimonial.saved: ${err.message}`);
      channel.nack(message, false, true);
    }
  }

  @EventPattern('testimonial.deleted')
  async onTestimonialDeleted(
    @Payload() data: { id: string },
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      this.logger.log(`Received testimonial.deleted for id: ${data.id}`);
      await this.testimonialsService.deleteByPayloadId(data.id);
      channel.ack(message);
    } catch (err) {
      this.logger.error(`Failed to handle testimonial.deleted: ${err.message}`);
      channel.nack(message, false, true);
    }
  }
}

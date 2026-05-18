import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Testimonial } from './entities/testimonial.entity';

@Injectable()
export class TestimonialsEventPublisher {
  private readonly logger = new Logger(TestimonialsEventPublisher.name);

  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  async publishTestimonialUpdated(testimonial: Testimonial): Promise<void> {
    const payload = {
      pattern: 'testimonial.updated',
      data: {
        id: testimonial.id,
        authorName: testimonial.authorName,
        authorTitle: testimonial.authorTitle,
        authorCompany: testimonial.authorCompany,
        quote: testimonial.quote,
        rating: testimonial.rating,
        featured: testimonial.featured,
        status: testimonial.status,
        sourceId: 'listings-service',
        timestamp: new Date().toISOString(),
      },
    };

    try {
      this.client.emit('testimonial.updated', payload);
      this.logger.log(`Published testimonial.updated for ${testimonial.id}`);
    } catch (err) {
      this.logger.error(`Failed to publish testimonial.updated for ${testimonial.id}:`, err);
    }
  }
}

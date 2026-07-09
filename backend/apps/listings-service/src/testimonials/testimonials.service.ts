import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimonial } from './entities/testimonial.entity';
import { TestimonialsEventPublisher } from './testimonials-event.publisher';

@Injectable()
export class TestimonialsService {
  private readonly logger = new Logger(TestimonialsService.name);

  constructor(
    @InjectRepository(Testimonial)
    private readonly repo: Repository<Testimonial>,
    private readonly eventPublisher: TestimonialsEventPublisher,
  ) {}

  async findAllFeatured(): Promise<Testimonial[]> {
    return this.repo.find({
      where: { featured: true, status: 'published' },
      order: { createdAt: 'DESC' },
    });
  }

  async upsert(data: Partial<Testimonial> & { payloadId: string; sourceId?: string }): Promise<void> {
    const existing = await this.repo.findOne({ where: { payloadId: data.payloadId } });
    let saved: Testimonial | null;

    if (existing) {
      await this.repo.update(existing.id, data);
      saved = await this.repo.findOne({ where: { id: existing.id } });
      this.logger.log(`Updated testimonial: ${data.payloadId}`);
    } else {
      const created = this.repo.create(data);
      saved = await this.repo.save(created);
      this.logger.log(`Created testimonial: ${data.payloadId}`);
    }

    // Publish sync event if the change didn't originate from CMS
    if (data.sourceId !== 'cms-service' && saved) {
      await this.eventPublisher.publishTestimonialUpdated(saved);
    }
  }

  async deleteByPayloadId(payloadId: string): Promise<void> {
    await this.repo.delete({ payloadId });
    this.logger.log(`Deleted testimonial: ${payloadId}`);
  }
}

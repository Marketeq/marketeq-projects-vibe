import { Controller, Post, Body, Headers, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { ListingStatus } from '../shared/enums/listing.enum';
import { slugify } from '../shared/utils/slugify';

@Controller('internal/services')
export class ServicesSeedController {
  constructor(
    @InjectRepository(Service)
    private readonly repo: Repository<Service>,
    private readonly config: ConfigService,
  ) {}

  private validateToken(token: string | undefined): void {
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || token !== expected) throw new ForbiddenException('Invalid internal token');
  }

  @Post('seed')
  async seed(
    @Headers('x-internal-token') token: string | undefined,
    @Body() dto: any,
  ) {
    this.validateToken(token);

    const slug = slugify(dto.title) + '-' + Date.now().toString(36);

    const item = this.repo.create({
      title: dto.title,
      description: dto.description,
      shortDescription: dto.shortDescription || '',
      slug,
      category: Array.isArray(dto.categories) ? dto.categories[0] || null : null,
      categories: dto.categories || [],
      skills: dto.skills || [],
      tags: dto.tags || [],
      industry: dto.industry || [],
      mediaUrls: dto.mediaUrls || [],
      faqs: dto.faqs || [],
      deliverables: dto.deliverables || [],
      priceMin: dto.priceMin || null,
      priceMax: dto.priceMax || null,
      deliveryTime: dto.deliveryTime || null,
      status: ListingStatus.Published,
      createdBy: 'seed:n8n-automation',
    });

    const saved = await this.repo.save(item);
    return saved;
  }
}

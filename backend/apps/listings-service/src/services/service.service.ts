import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ListingStatus } from '../shared/enums/listing.enum';
import { slugify } from '../shared/utils/slugify';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @InjectRepository(Service)
    private readonly repo: Repository<Service>,
  ) {}

  findAll(status = ListingStatus.Published) {
    return this.repo.find({ where: { status, listingType: 'service' }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id, listingType: 'service' } });
    if (!item) throw new NotFoundException(`Service with id ${id} not found`);
    return item;
  }

  async findBySlug(slug: string) {
    const item = await this.repo.findOne({ where: { slug, listingType: 'service' } });
    if (!item) throw new NotFoundException('Service not found');
    return item;
  }

  async seedFromN8n(dto: Record<string, any>) {
    const { randomUUID } = await import('crypto');
    const toStringArray = (v: any): string[] => {
      if (Array.isArray(v)) return v.filter((x) => x != null && x !== '');
      if (typeof v === 'string' && v.trim()) return [v.trim()];
      return [];
    };
    const title = String(dto.title ?? '').trim();
    if (!title) throw new BadRequestException('title is required');
    const description = String(dto.description ?? dto.fullDescription ?? '').trim();
    if (!description) throw new BadRequestException('description or fullDescription is required');

    let slug = slugify(title) || 'service';
    const conflict = await this.repo.findOne({ where: { slug }, select: ['id'] });
    if (conflict) slug = `${slug}-${randomUUID().slice(0, 8)}`;

    const item = this.repo.create({
      listingType: 'service',
      payloadId: `n8n-${randomUUID()}`,
      title,
      description,
      shortDescription: dto.shortDescription ?? null,
      skills: toStringArray(dto.skills),
      tags: toStringArray(dto.tags),
      categories: toStringArray(dto.categories ?? dto.category).filter(c => c !== 'null' && c !== 'undefined'),
      category: toStringArray(dto.categories ?? dto.category).filter(c => c !== 'null' && c !== 'undefined')[0] ?? null,
      industry: toStringArray(dto.industry),
      mediaUrls: this.resolveMediaUrls(dto.mediaUrls, dto.categories ?? dto.category ?? []),
      ...(!dto.priceMin && !dto.priceMax
        ? this.defaultServicePricing(dto.categories ?? dto.category ?? [])
        : { priceMin: dto.priceMin ?? null, priceMax: dto.priceMax ?? null }),
      status: ListingStatus.Published,
      createdBy: 'n8n-seed',
      slug,
    });

    const saved = await this.repo.save(item);
    this.logger.log(`Seeded service ${saved.id} from n8n`);
    return { ...saved, _contentType: 'service' };
  }

  private defaultServicePricing(categories: any): { priceMin: number; priceMax: number } {
    const cats = (Array.isArray(categories) ? categories : [categories])
      .map((c: any) => String(c ?? '').toLowerCase()).join(' ');
    if (/design|ui|ux/.test(cats)) return { priceMin: 500, priceMax: 3000 };
    if (/ai|ml|machine|data/.test(cats)) return { priceMin: 1500, priceMax: 8000 };
    if (/devops|cloud|infra/.test(cats)) return { priceMin: 1000, priceMax: 5000 };
    if (/mobile|ios|android/.test(cats)) return { priceMin: 2000, priceMax: 10000 };
    if (/marketing|seo|growth/.test(cats)) return { priceMin: 300, priceMax: 2000 };
    if (/content|copy|writ/.test(cats)) return { priceMin: 100, priceMax: 1000 };
    if (/ecommerce|shop/.test(cats)) return { priceMin: 800, priceMax: 4000 };
    return { priceMin: 500, priceMax: 3000 };
  }

  private resolveMediaUrls(mediaUrls: any, categories: any): string[] {
    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) return mediaUrls;
    const cats: string[] = Array.isArray(categories)
      ? categories
      : typeof categories === 'string'
      ? [categories]
      : [];
    const cat = cats.map((c) => c.toLowerCase()).join(' ');
    const FALLBACKS: [RegExp, string][] = [
      [/design|ui|ux/, 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=500&fit=crop&q=80'],
      [/ai|ml|machine|data/, 'https://images.unsplash.com/photo-1531746790095-e5995fba66f9?w=800&h=500&fit=crop&q=80'],
      [/marketing|seo|growth/, 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop&q=80'],
      [/content|copy|writ/, 'https://images.unsplash.com/photo-1434626881859-194d67b2b86f?w=800&h=500&fit=crop&q=80'],
      [/mobile|ios|android/, 'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=800&h=500&fit=crop&q=80'],
      [/cloud|devops|infra/, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=500&fit=crop&q=80'],
      [/ecommerce|shop|retail/, 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop&q=80'],
      [/health|medical|clinic/, 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop&q=80'],
    ];
    for (const [pattern, url] of FALLBACKS) {
      if (pattern.test(cat)) return [url];
    }
    return ['https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=500&fit=crop&q=80'];
  }

  async create(dto: CreateServiceDto, userId: string) {
    const item = this.repo.create({
      ...dto,
      createdBy: userId,
      slug: slugify(dto.title),
    });
    const saved = await this.repo.save(item);
    this.logger.log(`Created service ${saved.id} by user ${userId}`);
    return saved;
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async publish(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { status: ListingStatus.Published });
    this.logger.log(`Published service ${id}`);
    return this.findOne(id);
  }

  async archive(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { status: ListingStatus.Archived });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.delete(id);
    this.logger.log(`Deleted service ${id}`);
  }
}

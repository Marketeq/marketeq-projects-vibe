import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
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
    @Inject('ALGOLIA_CLIENT')
    private readonly algoliaClient: ClientProxy,
  ) {}

  findAll(status = ListingStatus.Published) {
    return this.repo.find({ where: { status }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Service with id ${id} not found`);
    return item;
  }

  async findBySlug(slug: string) {
    const item = await this.repo.findOne({ where: { slug } });
    if (!item) throw new NotFoundException('Service not found');
    return item;
  }

  async create(dto: CreateServiceDto, userId: string) {
    const item = this.repo.create({
      ...dto,
      createdBy: userId,
      slug: slugify(dto.title),
    });
    const saved = await this.repo.save(item);
    this.logger.log(`Created service ${saved.id} by user ${userId}`);
    this.emitUpsert('listing.created', saved);
    return saved;
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    const updated = (await this.repo.findOne({ where: { id } }))!;
    this.emitUpsert('listing.updated', updated);
    return updated;
  }

  async publish(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { status: ListingStatus.Published });
    this.logger.log(`Published service ${id}`);
    const published = (await this.repo.findOne({ where: { id } }))!;
    this.emitUpsert('listing.updated', published);
    return published;
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
    this.algoliaClient.emit<void>('listing.deleted', { id, type: 'service' }).subscribe({
      error: (err: Error) =>
        this.logger.warn(`Failed to emit listing.deleted for service ${id}: ${err.message}`),
    });
  }

  private emitUpsert(event: string, service: Service): void {
    const payload = this.buildPayload(service);
    this.algoliaClient.emit<void>(event, payload).subscribe({
      error: (err: Error) =>
        this.logger.warn(`Failed to emit ${event} for service ${service.id}: ${err.message}`),
    });
  }

  private buildPayload(service: Service) {
    return {
      id: service.id,
      type: 'service' as const,
      ownerId: service.createdBy,
      createdAt: service.createdAt.toISOString(),
      rating: service.rating ? Number(service.rating) : null,
      title: service.title,
      description: service.description ?? null,
      skills: service.skills ?? [],
      category: service.category ?? null,
      industry: service.industry?.[0] ?? null,
      tags: service.tags ?? [],
      subtitle: service.shortDescription ?? null,
      overview: null,
      technologies: [
        ...(service.programmingLanguages ?? []),
        ...(service.developmentTech ?? []),
      ],
      subcategories: service.subcategories ?? [],
      projectLead: null,
      deliverables: service.deliverables?.join(', ') || null,
      projectType: null,
      budgetMin: null,
      budgetMax: null,
      projectDurationRange: null,
      teamSizeRange: null,
      additionalTags: [],
      timeline: service.deliveryTime ?? null,
      pricingModel: null,
      deliveryTime: service.deliveryTime ?? null,
      priceMin: service.priceMin ? Number(service.priceMin) : null,
      priceMax: service.priceMax ? Number(service.priceMax) : null,
    };
  }
}

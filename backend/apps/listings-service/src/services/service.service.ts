import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ListingStatus } from '../shared/enums/listing.enum';
import { slugify } from '../shared/utils/slugify';
import { UserProfileClient } from '../shared/user-profile/user-profile.client';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @InjectRepository(Service)
    private readonly repo: Repository<Service>,
    @Inject('ALGOLIA_CLIENT')
    private readonly algoliaClient: ClientProxy,
    private readonly userProfileClient: UserProfileClient,
  ) {}

  async findAll(status = ListingStatus.Published) {
    const items = await this.repo.find({ where: { status, listingType: 'service' }, order: { createdAt: 'DESC' } });
    const teamByService = await this.resolveTeamAvatars(items);
    return items.map((item) => {
      const team = teamByService.get(String(item.id));
      return {
        ...item,
        teamAvatars: team?.avatars ?? [],
        teamMembers: team?.members ?? [],
      };
    });
  }

  private async resolveTeamAvatars(
    services: Service[],
  ): Promise<Map<string, { avatars: string[]; members: Array<{ avatarUrl: string; firstName: string; username: string }> }>> {
    const idsByService = new Map<string, string[]>();
    const allIds = new Set<string>();
    for (const s of services) {
      const memberIds =
        Array.isArray((s as any).teamMemberIds) && (s as any).teamMemberIds.length
          ? (s as any).teamMemberIds
          : (s as any).userId
            ? [String((s as any).userId)]
            : [];
      idsByService.set(String(s.id), memberIds);
      memberIds.forEach((id: string) => allIds.add(id));
    }
    if (allIds.size === 0) return new Map();

    const rows: Array<{ id: string; avatarUrl: string | null; firstName: string | null; username: string | null }> =
      await this.repo.manager.query(
        `SELECT id::text, "avatarUrl", "firstName", username FROM user_service.users WHERE id = ANY($1::uuid[])`,
        [Array.from(allIds)],
      );
    const infoById = new Map(rows.map((r) => [r.id, { avatarUrl: r.avatarUrl, firstName: r.firstName, username: r.username }]));

    const missingIds = Array.from(allIds).filter((id) => !infoById.has(id));
    if (missingIds.length) {
      const authRows: Array<{ id: string; email: string | null }> = await this.repo.manager.query(
        `SELECT id::text, email FROM public.users WHERE id = ANY($1::uuid[])`,
        [missingIds],
      );
      for (const r of authRows) {
        const namePart = r.email ? r.email.split('@')[0] : null;
        infoById.set(r.id, { avatarUrl: null, firstName: namePart, username: null });
      }
    }

    const result = new Map<string, { avatars: string[]; members: Array<{ avatarUrl: string; firstName: string; username: string }> }>();
    for (const [serviceId, memberIds] of idsByService) {
      const validMembers = memberIds.filter((id: string) => infoById.has(id)).slice(0, 4);
      result.set(serviceId, {
        avatars: validMembers.map((id: string) => infoById.get(id)?.avatarUrl ?? ''),
        members: validMembers.map((id: string) => {
          const info = infoById.get(id);
          return {
            avatarUrl: info?.avatarUrl ?? '',
            firstName: info?.firstName ?? '',
            username: info?.username ?? '',
          };
        }),
      });
    }
    return result;
  }

  async claim(id: string, userId: string) {
    if (!userId) throw new ForbiddenException('Sign in to claim a service');

    const result = await this.repo
      .createQueryBuilder()
      .update(Service)
      .set({ userId })
      .where('id = :id', { id })
      .andWhere('"userId" IS NULL')
      .execute();

    if (!result.affected) {
      const existing = await this.repo.findOne({ where: { id } });
      if (!existing) throw new NotFoundException('Service not found');
      if (existing.userId === userId) return this.findOne(id);
      throw new ConflictException('This service has just been claimed by someone else');
    }

    const claimed = await this.repo.findOne({ where: { id } });
    if (claimed) this.emitAlgoliaUpsert(claimed);
    return this.findOne(id);
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id, listingType: 'service' } });
    if (!item) throw new NotFoundException(`Service with id ${id} not found`);
    return item;
  }

  async findBySlug(slug: string) {
    const item = await this.repo.findOne({ where: { slug, listingType: 'service' } });
    if (!item) throw new NotFoundException('Service not found');
    // QA-192/PMCM-402: archiving must hide the listing outright, even
    // though the `publishedSnapshot` exception below is otherwise correct
    // (it exists so a service being re-edited after publish keeps showing
    // its last-published content publicly while the draft is in progress).
    // Without this, an archived service that had ever been published stays
    // fully visible via its old public slug — the exact case this ticket
    // is about.
    if (item.status === ListingStatus.Archived) {
      throw new NotFoundException('Service not found');
    }
    if (item.status !== ListingStatus.Published && !item.publishedSnapshot) {
      throw new NotFoundException('Service not found');
    }
    if (item.publishedSnapshot) {
      Object.assign(item, item.publishedSnapshot);
    }
    const team = await this.userProfileClient.hydrateTeam(
      item.teamMemberIds,
      item.userId,
    );
    return { ...item, team };
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
    this.emitAlgoliaUpsert(saved);
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
    this.emitAlgoliaUpsert(saved);
    return saved;
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    const updated = await this.repo.findOne({ where: { id } });
    if (updated) this.emitAlgoliaUpsert(updated);
    return this.findOne(id);
  }

  async publish(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { status: ListingStatus.Published });
    this.logger.log(`Published service ${id}`);
    const published = await this.repo.findOne({ where: { id } });
    if (published) this.emitAlgoliaUpsert(published);
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
    this.algoliaClient.emit<void>('listing.deleted', { id }).subscribe({
      error: (err: Error) =>
        this.logger.warn(`Failed to emit listing.deleted for ${id}: ${err.message}`),
    });
  }

  private emitAlgoliaUpsert(service: Service): void {
    const payload = {
      id: String(service.id),
      title: service.title,
      description: service.shortDescription ?? service.description?.substring(0, 500) ?? null,
      category: service.category ?? service.categories?.[0] ?? null,
      categories: service.categories ?? [],
      skills: service.skills ?? [],
      tags: service.tags ?? [],
      industries: service.industry ?? [],
      priceMin: service.priceMin != null ? Number(service.priceMin) : null,
      priceMax: service.priceMax != null ? Number(service.priceMax) : null,
      status: service.status,
      slug: service.slug,
    };
    const event = service.status === ListingStatus.Published ? 'listing.updated' : 'listing.created';
    this.algoliaClient.emit<void>(event, payload).subscribe({
      error: (err: Error) =>
        this.logger.warn(`Failed to emit ${event} for ${service.id}: ${err.message}`),
    });
  }
}

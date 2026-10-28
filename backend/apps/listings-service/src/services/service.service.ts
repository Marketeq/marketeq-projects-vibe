import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { ClientProxy } from '@nestjs/microservices';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ListingStatus } from '../shared/enums/listing.enum';
import { slugify } from '../shared/utils/slugify';
import { UserProfileClient } from '../shared/user-profile/user-profile.client';
import { IdentityVerificationGateClient } from '../identity-gate/identity-verification-gate.client';
import { VerificationRequiredException } from '../identity-gate/identity-gate.exceptions';
import { isSameAccount } from '../identity-gate/viewer.decorator';
import { RosterGateService } from '../identity-gate/roster-gate.service';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @InjectRepository(Service)
    private readonly repo: Repository<Service>,
    @Inject('ALGOLIA_CLIENT')
    private readonly algoliaClient: ClientProxy,
    private readonly userProfileClient: UserProfileClient,
    private readonly identityGate: IdentityVerificationGateClient,
    private readonly rosterGate: RosterGateService,
  ) {}

  // The listing type defines the context: a service is a talent-owned listing,
  // so every publish / republish / claim of one is a talent action and is
  // gated (G2) whatever roles the account holds. The owner is userId when set,
  // otherwise createdBy only when it is a real user id - system values such as
  // 'n8n-seed' or 'seed:n8n-automation' are not owners.
  private ownerOf(service: Pick<Service, 'userId' | 'createdBy'>): string | null {
    if (service.userId) return service.userId;
    return service.createdBy && isUUID(service.createdBy) ? service.createdBy : null;
  }

  private assertOwner(service: Pick<Service, 'userId' | 'createdBy'>, actorId: string): void {
    const owner = this.ownerOf(service);
    if (!actorId || !owner || owner !== actorId) {
      throw new ForbiddenException('You do not own this service');
    }
  }

  /** Throws 403 VERIFICATION_REQUIRED (own requirements) or 503 when unanswered. */
  private async assertGateOpen(talentId: string, disclose = true): Promise<void> {
    const decision = await this.identityGate.checkGate(talentId);
    if (decision.gateOpen) return;
    throw new VerificationRequiredException(
      disclose ? (decision.missingRequirements as 'identity' | 'location' | 'both') : undefined,
    );
  }

  async findAll(status = ListingStatus.Published) {
    const all = await this.repo.find({ where: { status, listingType: 'service' }, order: { createdAt: 'DESC' } });
    // G5: one local lookup for every account on the page (owners and members).
    // Display only - nothing stored changes, and a listing returns by itself when
    // its owner's gate opens again.
    const gateOpenIds = await this.rosterGate.visibleUserIds(all.flatMap((s) => this.rosterIdsOf(s)));
    // A listing whose owner has no known open gate is withheld from marketplace
    // discovery (no public owner exemption); ownerless/system listings are not.
    const items = all.filter((s) => {
      const owner = this.listingOwnerOf(s);
      return !owner || gateOpenIds.has(owner);
    });
    const teamByService = await this.resolveTeamAvatars(items, gateOpenIds);
    return items.map((item) => {
      const team = teamByService.get(String(item.id));
      return {
        ...item,
        teamMemberIds: (item.teamMemberIds ?? []).filter((id) => gateOpenIds.has(id)),
        teamAvatars: team?.avatars ?? [],
        teamMembers: team?.members ?? [],
      };
    });
  }

  // The platform account that owns a listing, for gating purposes: userId, or a
  // createdBy that is a real user id (system values such as 'n8n-seed' are not
  // owners).
  private listingOwnerOf(service: Pick<Service, 'userId' | 'createdBy'>): string | null {
    return this.ownerOf(service);
  }

  // Who a listing's roster is made of: its member list, or its owner alone when
  // no members are recorded (same rule resolveTeamAvatars has always used) - plus
  // the owner, whose own gate decides whether the listing is shown at all.
  private rosterIdsOf(service: Service): string[] {
    const ids = new Set<string>();
    const members = (service as any).teamMemberIds;
    if (Array.isArray(members)) members.forEach((m: unknown) => ids.add(String(m)));
    const owner = this.listingOwnerOf(service);
    if (owner) ids.add(owner);
    return Array.from(ids);
  }

  private async resolveTeamAvatars(
    services: Service[],
    gateOpenIds: Set<string>,
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
      const visibleMemberIds = memberIds.filter((id: string) => gateOpenIds.has(id));
      idsByService.set(String(s.id), visibleMemberIds);
      visibleMemberIds.forEach((id: string) => allIds.add(id));
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

    const current = await this.repo.findOne({ where: { id, listingType: 'service' } });
    if (!current) throw new NotFoundException('Service not found');
    if (current.userId === userId) return this.findOne(id);
    if (current.userId) {
      throw new ConflictException('This service has just been claimed by someone else');
    }
    // Only a system-seeded service (no real-user creator) is claimable, or a
    // service the claimer created themselves.
    const creator = this.ownerOf(current);
    if (creator && creator !== userId) throw new ForbiddenException('You do not own this service');
    // Claiming is a talent action: gate it before any ownership change.
    await this.assertGateOpen(userId);

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

  // Raw read for internal callers (owner operations, the service.findById RPC).
  // Public/client-facing reads use findOneForViewer / findBySlug.
  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id, listingType: 'service' } });
    if (!item) throw new NotFoundException(`Service with id ${id} not found`);
    return item;
  }

  /**
   * GET /v1/services/:id. The viewer is the authenticated caller (null when
   * anonymous), derived server-side from the bearer token - never from a query
   * or body parameter. The listing itself stays available to everyone; what
   * changes is who is on it (see presentRoster).
   */
  async findOneForViewer(id: string, viewerId: string | null) {
    const item = await this.findOne(id);
    return this.presentRoster(item, viewerId, false);
  }

  async findBySlug(slug: string, viewerId: string | null = null) {
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
    return this.presentRoster(item, viewerId, true);
  }

  /**
   * G5 - who appears on a service's detail.
   *
   * Public and client viewers get a roster where every member (and the owner)
   * without a known open gate is COMPLETELY ABSENT: not in `team`, not in the raw
   * `teamMemberIds`, not as `userId`, and not flagged as hidden. The owner sees
   * everyone, each hidden member marked only with the neutral "Not shown to
   * clients" - never a reason. Nothing stored is read-modified: this builds a
   * response, it does not change the listing or any membership.
   */
  private async presentRoster(item: Service, viewerId: string | null, hydrate: boolean) {
    const owner = this.listingOwnerOf(item);
    const ownerView = !!owner && isSameAccount(owner, viewerId);
    const allMemberIds = (item.teamMemberIds ?? []).map(String);

    if (ownerView) {
      const open = await this.rosterGate.visibleUserIds([owner, ...allMemberIds]);
      const notShown = [...new Set([owner, ...allMemberIds])].filter((id) => !open.has(id));
      const team = hydrate ? await this.userProfileClient.hydrateTeam(allMemberIds, item.userId) : undefined;
      return {
        ...item,
        ...(hydrate ? { team } : {}),
        // Owner-only, neutral: which of their own people clients do not see right now.
        ...(notShown.length ? { notShownToClients: notShown.map((userId) => ({ userId, label: 'Not shown to clients' })) } : {}),
      };
    }

    const open = await this.rosterGate.visibleUserIds([owner, ...allMemberIds]);
    const memberIds = allMemberIds.filter((id) => open.has(id));
    const ownerShown = !!owner && open.has(owner);
    // Hydrated BEFORE anything is returned, only for visible members, so a hidden
    // member's profile is never even fetched.
    const team = hydrate
      ? await this.userProfileClient.hydrateTeam(memberIds, ownerShown ? item.userId : null)
      : undefined;
    return {
      ...item,
      ...(hydrate ? { team } : {}),
      teamMemberIds: memberIds,
      // A hidden owner's identity is not disclosed through the owner fields either.
      userId: item.userId && !open.has(String(item.userId)) ? null : item.userId,
      createdBy: item.createdBy && owner && item.createdBy === owner && !ownerShown ? null : item.createdBy,
    };
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
    // G2 (PMCM-652): creating a service, drafts included, needs an open gate.
    await this.assertGateOpen(userId);
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

  async update(id: string, dto: UpdateServiceDto, actorId: string) {
    const existing = await this.findOne(id);
    this.assertOwner(existing, actorId);
    // A status write that makes a non-public service public is a publish.
    if (dto.status === ListingStatus.Published && existing.status !== ListingStatus.Published) {
      await this.assertGateOpen(actorId);
    }
    return this.applyUpdate(id, dto);
  }

  /**
   * CMS-driven status sync (internal token, no acting user). A service with a
   * real talent owner is gated on that owner when the patch would make it
   * public; the owner's missing requirements are not disclosed to the system
   * caller. A system-seeded service has no talent owner and is exempt.
   */
  async updateFromCms(id: string, patch: UpdateServiceDto) {
    const existing = await this.findOne(id);
    const owner = this.ownerOf(existing);
    if (owner && patch.status === ListingStatus.Published && existing.status !== ListingStatus.Published) {
      await this.assertGateOpen(owner, false);
    }
    return this.applyUpdate(id, patch);
  }

  private async applyUpdate(id: string, dto: UpdateServiceDto) {
    await this.repo.update(id, dto);
    const updated = await this.repo.findOne({ where: { id } });
    if (updated) this.emitAlgoliaUpsert(updated);
    return this.findOne(id);
  }

  async publish(id: string, actorId: string) {
    const existing = await this.findOne(id);
    this.assertOwner(existing, actorId);
    await this.assertGateOpen(actorId);
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

  // Fire-and-forget, as before. The owner's last known gate rides along (looked up
  // locally, never from identity) so the index copy of the listing is hidden
  // while the owner has no known open gate; a later gate change updates it.
  private emitAlgoliaUpsert(service: Service): void {
    void this.emitAlgoliaUpsertWithOwnerGate(service);
  }

  private async emitAlgoliaUpsertWithOwnerGate(service: Service): Promise<void> {
    const owner = this.listingOwnerOf(service);
    const open = owner ? await this.rosterGate.visibleUserIds([owner]) : new Set<string>();
    const payload = {
      id: String(service.id),
      ...(owner ? { ownerId: owner, ownerGateOpen: open.has(owner) } : {}),
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

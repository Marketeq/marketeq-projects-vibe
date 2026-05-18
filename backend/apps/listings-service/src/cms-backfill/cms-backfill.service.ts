import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { Testimonial } from '../testimonials/entities/testimonial.entity';
import { Team } from '../teams/entities/team.entity';
import { Service } from '../services/entities/service.entity';
import { Job } from '../jobs/entities/job.entity';
import { ProjectEventPublisher } from '../projects/project-event.publisher';
import { TestimonialsEventPublisher } from '../testimonials/testimonials-event.publisher';

const PAGE_SIZE = 50;
const BOOT_DELAY_MS = 5_000;
const PAGE_DELAY_MS = 300;

@Injectable()
export class CmsBackfillService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CmsBackfillService.name);

  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Testimonial) private readonly testimonialRepo: Repository<Testimonial>,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    @InjectRepository(Service) private readonly serviceRepo: Repository<Service>,
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    private readonly projectPublisher: ProjectEventPublisher,
    private readonly testimonialPublisher: TestimonialsEventPublisher,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get<string>('CMS_BACKFILL_ON_BOOT') === 'false') return;
    await new Promise((r) => setTimeout(r, BOOT_DELAY_MS));
    await Promise.all([
      this.backfillProjects(),
      this.backfillTestimonials(),
      this.backfillToCms('team-listings', this.teamRepo, (t: Team) => ({
        sourceId: t.id,
        title: t.title,
        slug: t.slug ?? t.id,
        status: t.status,
        featured: t.featured,
        rating: t.rating,
        reviewCount: t.reviewCount,
      })),
      this.backfillToCms('service-listings', this.serviceRepo, (s: Service) => ({
        sourceId: s.id,
        title: s.title,
        slug: s.slug ?? s.id,
        status: s.status,
        featured: s.featured,
        rating: s.rating,
        reviewCount: s.reviewCount,
        priceMin: s.priceMin,
        priceMax: s.priceMax,
        deliveryTime: s.deliveryTime,
        excerpt: s.shortDescription,
      })),
      this.backfillToCms('job-listings', this.jobRepo, (j: Job) => ({
        sourceId: j.id,
        title: j.title,
        slug: j.slug ?? j.id,
        status: j.status,
        featured: j.featured,
        jobType: j.jobType,
        location: j.location,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
      })),
    ]);
  }

  // ── Backfill entities → CMS REST API ──────────────────────────────────────

  private async backfillToCms<T extends { id: string; payloadId?: string | null }>(
    collection: string,
    repo: Repository<T>,
    toPayload: (entity: T) => Record<string, any>,
  ): Promise<void> {
    const cmsUrl = this.config.get<string>('CMS_URL') || 'http://localhost:3020';
    const email = this.config.get<string>('CMS_ADMIN_EMAIL') || 'admin@marketeq.com';
    const password = this.config.get<string>('CMS_ADMIN_PASSWORD') || 'password123';

    // Authenticate
    let token: string;
    try {
      const loginRes = await fetch(`${cmsUrl}/api/users/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!loginRes.ok) {
        this.logger.warn(`[CmsBackfill:${collection}] CMS login failed — skipping`);
        return;
      }
      const loginData = await loginRes.json() as any;
      token = loginData?.token;
      if (!token) {
        this.logger.warn(`[CmsBackfill:${collection}] No token from CMS — skipping`);
        return;
      }
    } catch (err: any) {
      this.logger.warn(`[CmsBackfill:${collection}] CMS unreachable — skipping: ${err.message}`);
      return;
    }

    // Find entities that haven't been pushed to CMS yet
    let entities: T[];
    try {
      entities = await repo.find({ where: { payloadId: IsNull() } as any });
    } catch (err: any) {
      this.logger.warn(`[CmsBackfill:${collection}] Table not ready — skipping: ${err.message}`);
      return;
    }

    this.logger.log(`[CmsBackfill:${collection}] ${entities.length} entities without payloadId`);
    let created = 0;
    let failed = 0;

    for (const entity of entities) {
      try {
        const data = toPayload(entity);

        // Check if CMS record already exists by sourceId
        const checkRes = await fetch(
          `${cmsUrl}/api/${collection}?where[sourceId][equals]=${entity.id}&limit=1`,
          { headers: { Authorization: `JWT ${token}` } },
        );
        const checkData = await checkRes.json() as any;
        const existing = checkData?.docs?.[0];

        let payloadId: string;
        if (existing) {
          payloadId = String(existing.id);
        } else {
          const createRes = await fetch(`${cmsUrl}/api/${collection}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', Authorization: `JWT ${token}` },
            body: JSON.stringify({ ...data, _status: 'published' }),
          });
          if (!createRes.ok) {
            const txt = await createRes.text();
            this.logger.error(`[CmsBackfill:${collection}] Create failed for ${entity.id}: ${txt}`);
            failed++;
            continue;
          }
          const created_ = await createRes.json() as any;
          payloadId = String(created_.doc?.id ?? created_.id);
        }

        // Store payloadId back on entity
        await repo.update(entity.id, { payloadId } as any);
        created++;
      } catch (err: any) {
        failed++;
        this.logger.error(`[CmsBackfill:${collection}] Failed for ${entity.id}: ${err.message}`);
      }

      await new Promise((r) => setTimeout(r, 50));
    }

    this.logger.log(`[CmsBackfill:${collection}] Done — created/linked: ${created}, failed: ${failed}`);
  }

  // ── Existing project + testimonial backfill (unchanged) ───────────────────

  private async backfillProjects(): Promise<void> {
    const total = await this.projectRepo.count();
    this.logger.log(`[CmsBackfill:projects] Starting — ${total} projects to sync`);
    let offset = 0, published = 0, failed = 0;
    while (offset < total) {
      const projects = await this.projectRepo.find({ order: { createdAt: 'ASC' }, skip: offset, take: PAGE_SIZE });
      for (const project of projects) {
        try { await this.projectPublisher.publishProjectUpdated(project); published++; }
        catch (err: any) { failed++; this.logger.error(`[CmsBackfill:projects] Failed for ${project.id}: ${err.message}`); }
      }
      offset += PAGE_SIZE;
      if (offset < total) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
    }
    this.logger.log(`[CmsBackfill:projects] Done — published: ${published}, failed: ${failed}`);
  }

  private async backfillTestimonials(): Promise<void> {
    let total: number;
    try { total = await this.testimonialRepo.count(); }
    catch (err: any) { this.logger.warn(`[CmsBackfill:testimonials] Skipped: ${err.message}`); return; }
    this.logger.log(`[CmsBackfill:testimonials] Starting — ${total} testimonials to sync`);
    let offset = 0, published = 0, failed = 0;
    while (offset < total) {
      const testimonials = await this.testimonialRepo.find({ order: { createdAt: 'ASC' }, skip: offset, take: PAGE_SIZE });
      for (const t of testimonials) {
        try { await this.testimonialPublisher.publishTestimonialUpdated(t); published++; }
        catch (err: any) { failed++; this.logger.error(`[CmsBackfill:testimonials] Failed for ${t.id}: ${err.message}`); }
      }
      offset += PAGE_SIZE;
      if (offset < total) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
    }
    this.logger.log(`[CmsBackfill:testimonials] Done — published: ${published}, failed: ${failed}`);
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagEntity } from './entities/tag.entity';

type TagDto = { uuid?: string | null; name: string; slug: string };

@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);

  constructor(
    @InjectRepository(TagEntity) private readonly repo: Repository<TagEntity>,
    private readonly http: HttpService,
  ) {}

  /** ----- Local upsert & queries (Nest DB) -------------------------------- */

  /** Upsert a tag (by slug first, then uuid fallback) coming from Strapi/webhook/manual */
  async upsertFromStrapi(dto: TagDto): Promise<TagEntity> {
    // Try to find existing tag first
    let tag =
      (await this.repo.findOne({ where: { slug: dto.slug } })) ||
      (dto.uuid ? await this.repo.findOne({ where: { uuid: dto.uuid } }) : null);
  
    // If found, update
    if (tag) {
      const isChanged =
        tag.name !== dto.name ||
        tag.slug !== dto.slug ||
        (dto.uuid && tag.uuid !== dto.uuid);
  
      if (isChanged) {
        tag.name = dto.name ?? tag.name;
        tag.slug = dto.slug ?? tag.slug;
        if (dto.uuid && !tag.uuid) tag.uuid = dto.uuid;
  
        await this.repo.save(tag);
        this.logger.log(
          `Tag updated: ${tag.slug} (${tag.uuid ?? 'no-uuid'})`
        );
      } else {
        this.logger.log(
          `Tag already up-to-date: ${tag.slug} (${tag.uuid ?? 'no-uuid'})`
        );
      }
  
      return tag;
    }
  
    // If not found, insert new
    const newTag = this.repo.create({
      uuid: dto.uuid ?? null,
      name: dto.name,
      slug: dto.slug,
    });
  
    const saved = await this.repo.save(newTag);
    this.logger.log(
      `New tag inserted: ${saved.slug} (${saved.uuid ?? 'no-uuid'})`
    );
    return saved;
  }
  

  /** Find one local tag by slug (with error if not found) */
  async findBySlug(slug: string): Promise<TagEntity> {
    const tag = await this.repo.findOne({ where: { slug } });
    if (!tag) throw new NotFoundException(`Tag with slug '${slug}' not found`);
    return tag;
  }

  /** ----- Nest -> Strapi helpers (Content API) ---------------------------- */

  private baseStrapiUrl() {
    return (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/+$/, '');
  }

  private authHeader() {
    return process.env.STRAPI_TOKEN ? { Authorization: `Bearer ${process.env.STRAPI_TOKEN}` } : {};
  }

  private async findStrapiTagIdByUuid(uuid: string): Promise<number | null> {
    const url = `${this.baseStrapiUrl()}/api/tags?filters[uuid][$eq]=${encodeURIComponent(uuid)}`;
    const res = await this.http.axiosRef.get(url, { headers: this.authHeader() });
    const arr = res.data?.data ?? [];
    return arr.length ? arr[0].id : null;
  }

  private async findStrapiTagIdBySlug(slug: string): Promise<number | null> {
    const url = `${this.baseStrapiUrl()}/api/tags?filters[slug][$eq]=${encodeURIComponent(slug)}`;
    const res = await this.http.axiosRef.get(url, { headers: this.authHeader() });
    const arr = res.data?.data ?? [];
    return arr.length ? arr[0].id : null;
  }

  /** Create or update a Tag in Strapi from a local TagEntity */
  async pushTagToStrapi(tag: TagEntity): Promise<{ id: number }> {
    // Prefer lookup by uuid; fallback to slug.
    let existingId: number | null = null;
    if (tag.uuid) existingId = await this.findStrapiTagIdByUuid(tag.uuid);
    if (!existingId) existingId = await this.findStrapiTagIdBySlug(tag.slug);

    const payload = {
      data: {
        uuid: tag.uuid ?? null,
        name: tag.name,
        slug: tag.slug,
        // If you want to auto-publish (Strapi Draft & Publish), you can add:
        // publishedAt: new Date().toISOString(),
      },
    };

    if (existingId) {
      const url = `${this.baseStrapiUrl()}/api/tags/${existingId}`;
      const res = await this.http.axiosRef.put(url, payload, { headers: this.authHeader() });
      const id = res.data?.data?.id;
      this.logger.log(`Updated Strapi tag #${id} (${tag.slug})`);
      return { id };
    } else {
      const url = `${this.baseStrapiUrl()}/api/tags`;
      const res = await this.http.axiosRef.post(url, payload, { headers: this.authHeader() });
      const id = res.data?.data?.id;
      this.logger.log(`Created Strapi tag #${id} (${tag.slug})`);
      return { id };
    }
  }

  /** Convenience: create a dummy local tag then push it to Strapi */
  async createAndPushDummyTag(): Promise<TagEntity> {
    const { randomUUID } = await import('crypto');
    const t = this.repo.create({
      uuid: randomUUID(),
      name: 'Pushed Tag',
      slug: 'pushed-tag-' + Date.now(),
    });
    const saved = await this.repo.save(t);
    await this.pushTagToStrapi(saved);
    return saved;
  }
}

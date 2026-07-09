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

  /** Upsert a tag (by slug first, then uuid fallback) from CMS/webhook/manual */
  async upsertFromCms(dto: TagDto): Promise<TagEntity> {
    const tag =
      (await this.repo.findOne({ where: { slug: dto.slug } })) ||
      (dto.uuid ? await this.repo.findOne({ where: { uuid: dto.uuid } }) : null);

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
        this.logger.log(`Tag updated: ${tag.slug} (${tag.uuid ?? 'no-uuid'})`);
      } else {
        this.logger.log(`Tag already up-to-date: ${tag.slug} (${tag.uuid ?? 'no-uuid'})`);
      }

      return tag;
    }

    const newTag = this.repo.create({
      uuid: dto.uuid ?? null,
      name: dto.name,
      slug: dto.slug,
    });

    const saved = await this.repo.save(newTag);
    this.logger.log(`New tag inserted: ${saved.slug} (${saved.uuid ?? 'no-uuid'})`);
    return saved;
  }

  /** Find one local tag by slug (with error if not found) */
  async findBySlug(slug: string): Promise<TagEntity> {
    const tag = await this.repo.findOne({ where: { slug } });
    if (!tag) throw new NotFoundException(`Tag with slug '${slug}' not found`);
    return tag;
  }

  // ----- Nest -> CMS helpers (Payload REST API) -----

  private baseCmsUrl() {
    return (process.env.CMS_SERVICE_URL || 'http://localhost:3020').replace(/\/+$/, '');
  }

  private authHeader() {
    const key = process.env.CMS_API_KEY;
    return key ? { Authorization: `API-Key ${key}` } : {};
  }

  private async findCmsTagBySlug(slug: string): Promise<any | null> {
    const url = `${this.baseCmsUrl()}/api/tags?where[slug][equals]=${encodeURIComponent(slug)}&limit=1`;
    const res = await this.http.axiosRef.get(url, { headers: this.authHeader() });
    const docs = res.data?.docs ?? [];
    return docs.length ? docs[0] : null;
  }

  /** Create or update a Tag in CMS from a local TagEntity */
  async pushTagToCms(tag: TagEntity): Promise<{ id: number | string }> {
    const existing = await this.findCmsTagBySlug(tag.slug);

    const payload = {
      uuid: tag.uuid ?? null,
      name: tag.name,
      slug: tag.slug,
    };

    if (existing) {
      const url = `${this.baseCmsUrl()}/api/tags/${existing.id}`;
      const res = await this.http.axiosRef.patch(url, payload, { headers: this.authHeader() });
      const id = res.data?.doc?.id ?? existing.id;
      this.logger.log(`Updated CMS tag #${id} (${tag.slug})`);
      return { id };
    } else {
      const url = `${this.baseCmsUrl()}/api/tags`;
      const res = await this.http.axiosRef.post(url, payload, { headers: this.authHeader() });
      const id = res.data?.doc?.id ?? res.data?.id;
      this.logger.log(`Created CMS tag #${id} (${tag.slug})`);
      return { id };
    }
  }

  /** Convenience: create a dummy local tag then push it to CMS */
  async createAndPushDummyTag(): Promise<TagEntity> {
    const { randomUUID } = await import('crypto');
    const t = this.repo.create({
      uuid: randomUUID(),
      name: 'Pushed Tag',
      slug: 'pushed-tag-' + Date.now(),
    });
    const saved = await this.repo.save(t);
    await this.pushTagToCms(saved);
    return saved;
  }
}

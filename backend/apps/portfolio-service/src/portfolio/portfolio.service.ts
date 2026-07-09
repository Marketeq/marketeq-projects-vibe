import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PortfolioItem } from './portfolio.entity';
import { MediaService } from '../media/media.service';
import { extractKeysFromSchemaJson } from '../media/media.cleanup';


@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(PortfolioItem)
    private readonly repo: Repository<PortfolioItem>,
    private readonly mediaService: MediaService,
  ) {}

  async list(ownerUserId: string) {
    if (!ownerUserId) return [];
    return this.repo.find({
      where: { ownerUserId },
      order: { position: 'ASC', updatedAt: 'DESC' },
    });
  }

  async upsertDraft(dto: any) {
    const { ownerUserId, slug, title, sections } = dto || {};
    if (!ownerUserId || !slug) {
      return { ok: false, error: 'ownerUserId and slug are required' };
    }
    let item = await this.repo.findOne({ where: { ownerUserId, slug } });
    if (!item) {
      item = this.repo.create({
        ownerUserId,
        slug,
        title: title ?? '',
        sections: sections ?? null,
        status: 'draft',
      });
    } else {
      item.title = title ?? item.title;
      item.sections = sections ?? item.sections;
      item.status = 'draft';
    }
    const saved = await this.repo.save(item);
    return { ok: true, item: saved };
  }

  async publish(slug: string) {
    const item = await this.repo.findOne({ where: { slug } });
    if (!item) throw new NotFoundException('Not found');
    item.status = 'published';
    await this.repo.save(item);
    return { ok: true, slug };
  }

  async reorder(order: string[]) {
    if (!Array.isArray(order) || order.length === 0) {
      return { ok: true, updated: 0 };
    }
    const items = await this.repo.find({ where: { slug: In(order) } });
    const idx = new Map(order.map((s, i) => [s, i]));
    for (const it of items) {
      const pos = idx.get(it.slug);
      if (typeof pos === 'number') it.position = pos;
    }
    await this.repo.save(items);
    return { ok: true, updated: items.length };
  }

  async getPublic(slug: string) {
    const item = await this.repo.findOne({ where: { slug, status: 'published' } });
    if (!item) throw new NotFoundException('Not found');
    return item;
  }

  async getPreview(slug: string) {
    const item = await this.repo.findOne({ where: { slug } });
    if (!item) throw new NotFoundException('Not found');
    return item;
  }
  async cleanupMediaForPortfolio(schemaJson: unknown): Promise<void> {
    const publicBase = process.env.CLOUDFLARE_PUBLIC_URL || '';
    const keys = extractKeysFromSchemaJson(schemaJson, publicBase);
    for (const key of keys) {
      try {
        await this.mediaService.deleteFile(key);
      } catch {
        
      }
    }
  }
}

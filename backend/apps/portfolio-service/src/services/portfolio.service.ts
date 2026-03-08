import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioItem } from '../entities/portfolio-item.entity';
import { UpsertDraftDto } from '../dto/portfolio.dto';
import { sanitizeHtml } from '../util/sanitize';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(PortfolioItem)
    private readonly items: Repository<PortfolioItem>,
  ) {}

  async upsertDraft(dto: UpsertDraftDto): Promise<PortfolioItem> {
    let item = await this.items.findOne({ where: { slug: dto.slug } });
    const safeHtml = dto.htmlDraft ? sanitizeHtml(dto.htmlDraft) : null;

    if (!item) {
      item = this.items.create({
        slug: dto.slug,
        title: dto.title,
        ownerUserId: dto.ownerUserId,
        schemaJson: dto.schemaJson ?? null,
        htmlPreview: safeHtml,
        status: 'draft',
      });
    } else {
      item.title = dto.title;
      item.schemaJson = dto.schemaJson ?? item.schemaJson;
      item.htmlPreview = safeHtml ?? item.htmlPreview;
    }

    return this.items.save(item);
  }

  async publish(slug: string): Promise<PortfolioItem> {
    const item = await this.items.findOne({ where: { slug } });
    if (!item) throw new NotFoundException(`Portfolio not found: ${slug}`);
    item.htmlPublished = item.htmlPreview;
    item.status = 'published';
    return this.items.save(item);
  }

  async archive(slug: string): Promise<PortfolioItem> {
    const item = await this.items.findOne({ where: { slug } });
    if (!item) throw new NotFoundException(`Portfolio not found: ${slug}`);
    item.status = 'archived';
    return this.items.save(item);
  }

  async listByOwner(ownerUserId: string): Promise<PortfolioItem[]> {
    return this.items.find({
      where: { ownerUserId },
      order: { updatedAt: 'DESC' },
    });
  }

  async getPublicBySlug(slug: string): Promise<PortfolioItem> {
    const item = await this.items.findOne({ where: { slug, status: 'published' } });
    if (!item) throw new NotFoundException('Portfolio not found');
    return item;
  }

  async getPreviewBySlug(slug: string): Promise<PortfolioItem> {
    const item = await this.items.findOne({ where: { slug } });
    if (!item) throw new NotFoundException('Portfolio not found');
    return item;
  }

  async delete(slug: string, ownerUserId: string): Promise<void> {
    const item = await this.items.findOne({ where: { slug, ownerUserId } });
    if (!item) throw new NotFoundException('Portfolio not found');
    await this.items.remove(item);
  }
}

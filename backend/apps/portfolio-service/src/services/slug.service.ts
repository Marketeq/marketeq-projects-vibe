import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CaseStudy } from '../entities/case-study.entity';
import { slugify, MAX_SLUG_LENGTH } from '../util/slugify';

@Injectable()
export class SlugService {
  constructor(
    @InjectRepository(CaseStudy)
    private readonly caseStudies: Repository<CaseStudy>,
  ) {}

  /** Slugifies a title and appends a numeric suffix (-2, -3, ...) until it's unique. */
  async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    return this.ensureUnique(slugify(title), excludeId);
  }

  /** Re-checks an existing slug for conflicts (e.g. at publish time) and resolves them the same way. */
  async enforceUnique(slug: string, excludeId?: string): Promise<string> {
    return this.ensureUnique(slug, excludeId);
  }

  private async ensureUnique(baseSlug: string, excludeId?: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 2;

    while (await this.slugTaken(candidate, excludeId)) {
      const suffixStr = `-${suffix}`;
      candidate = `${baseSlug.slice(0, MAX_SLUG_LENGTH - suffixStr.length)}${suffixStr}`;
      suffix += 1;
    }

    return candidate;
  }

  private async slugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const query = this.caseStudies.createQueryBuilder('cs').where('cs.slug = :slug', { slug });

    if (excludeId) {
      query.andWhere('cs.id != :excludeId', { excludeId });
    }

    const existing = await query.getOne();
    return !!existing;
  }
}

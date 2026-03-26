import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Fuse from 'fuse.js';
import { AutocompleteEntry, EntryStatus, EntryType } from './entities/autocomplete-entry.entity';
import { AutocompleteReviewQueue, ReviewAction } from './entities/autocomplete-review-queue.entity';
import { AutocompleteCategory } from './entities/autocomplete-category.entity';
import { AutocompleteRejectedEntry } from './entities/autocomplete-rejected-entry.entity';
import { SubmitAutocompleteDto } from './dto/submit-autocomplete.dto';
import { ReviewAutocompleteDto } from './dto/review-autocomplete.dto';
import { QueryAutocompleteDto } from './dto/query-autocomplete.dto';
import { EntryFilter } from './filters/entry.filter';

// Heuristic keyword-to-category mapping
const CATEGORY_RULES: Record<string, string[]> = {
  tech: ['engineer', 'developer', 'backend', 'frontend', 'fullstack', 'blockchain', 'devops', 'cloud', 'software', 'programming', 'coding', 'api', 'database', 'ml', 'ai', 'data'],
  design: ['designer', 'ux', 'ui', 'graphic', 'visual', 'brand', 'illustration', 'motion', 'figma', 'sketch', 'photoshop'],
  marketing: ['seo', 'growth', 'media', 'content', 'marketing', 'advertising', 'social', 'email', 'campaign', 'analytics', 'ppc'],
  finance: ['accountant', 'finance', 'financial', 'bookkeeping', 'tax', 'audit', 'cfo', 'budget', 'payroll', 'investment'],
  legal: ['attorney', 'paralegal', 'compliance', 'legal', 'lawyer', 'contract', 'intellectual', 'litigation'],
  writing: ['writer', 'copywriter', 'editor', 'proofreader', 'journalist', 'blogger', 'content', 'technical', 'ghostwriter'],
  management: ['manager', 'director', 'executive', 'lead', 'head', 'chief', 'vp', 'president', 'founder', 'ceo', 'cto', 'coo'],
  sales: ['sales', 'business', 'account', 'revenue', 'customer', 'client', 'partnerships', 'crm', 'pipeline'],
  hr: ['recruiter', 'talent', 'hr', 'human', 'resources', 'onboarding', 'training', 'culture', 'hiring'],
  education: ['teacher', 'instructor', 'tutor', 'professor', 'curriculum', 'training', 'coach', 'mentor', 'educator'],
  healthcare: ['medical', 'health', 'doctor', 'nurse', 'clinical', 'pharma', 'biotech', 'therapy', 'wellness'],
};

function assignHeuristicCategory(label: string): string | null {
  const terms = label.toLowerCase().split(/[\s\-_]/);
  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    if (keywords.some(k => terms.includes(k))) {
      return category;
    }
  }
  return null;
}

@Injectable()
export class AutocompleteService {
  constructor(
    @InjectRepository(AutocompleteEntry)
    private readonly entryRepo: Repository<AutocompleteEntry>,
    @InjectRepository(AutocompleteReviewQueue)
    private readonly reviewRepo: Repository<AutocompleteReviewQueue>,
    @InjectRepository(AutocompleteCategory)
    private readonly categoryRepo: Repository<AutocompleteCategory>,
    @InjectRepository(AutocompleteRejectedEntry)
    private readonly rejectedRepo: Repository<AutocompleteRejectedEntry>,
    private readonly filter: EntryFilter,
  ) {}

  async submit(dto: SubmitAutocompleteDto): Promise<AutocompleteEntry> {
    const validation = this.filter.validate(dto.value);
    if (!validation.valid) {
      // Log the rejected entry
      await this.rejectedRepo.save(this.rejectedRepo.create({
        value: dto.value.trim(),
        normalized: this.filter.normalize(dto.value),
        type: dto.type,
        reason: validation.reason!,
        source: dto.source,
      }));
      throw new BadRequestException(`Invalid entry: ${validation.reason}`);
    }

    const normalized = this.filter.normalize(dto.value);

    // Deduplicate
    const existing = await this.entryRepo.findOne({
      where: { normalized, type: dto.type },
    });

    if (existing) {
      existing.frequency += 1;
      if (existing.status === EntryStatus.APPROVED) {
        return this.entryRepo.save(existing);
      }
      return existing;
    }

    // Assign category via heuristic matching
    const category = assignHeuristicCategory(dto.value);

    const entry = this.entryRepo.create({
      value: dto.value.trim(),
      normalized,
      type: dto.type,
      status: EntryStatus.PENDING,
      source: dto.source,
      frequency: 1,
      category: category ?? undefined,
    });

    const saved = await this.entryRepo.save(entry);

    // Add to review queue
    await this.reviewRepo.save(this.reviewRepo.create({ entryId: saved.id }));

    return saved;
  }

  async query(dto: QueryAutocompleteDto): Promise<AutocompleteEntry[]> {
    const limit = dto.limit ?? 10;
    const normalizedQ = this.filter.normalize(dto.q);

    // Load approved entries for this type to run Fuse.js fuzzy search
    const candidates = await this.entryRepo.find({
      where: { type: dto.type, status: EntryStatus.APPROVED },
      order: { frequency: 'DESC' },
      take: 500, // cap for in-memory search
    });

    if (candidates.length === 0) return [];

    const fuse = new Fuse(candidates, {
      keys: ['normalized', 'value'],
      threshold: 0.3,
      includeScore: true,
    });

    const results = fuse.search(normalizedQ, { limit });
    return results.map(r => r.item);
  }

  async getByType(type: EntryType): Promise<AutocompleteEntry[]> {
    return this.entryRepo.find({
      where: { type, status: EntryStatus.APPROVED },
      order: { frequency: 'DESC' },
      take: 100,
    });
  }

  async getCategoryMap(): Promise<Record<string, string[]>> {
    const entries = await this.entryRepo
      .createQueryBuilder('e')
      .select(['e.category', 'e.type'])
      .where('e.status = :status', { status: EntryStatus.APPROVED })
      .andWhere('e.category IS NOT NULL')
      .distinct(true)
      .getRawMany();

    return entries.reduce((map, row) => {
      const cat = row.e_category;
      const type = row.e_type;
      if (!map[cat]) map[cat] = [];
      if (!map[cat].includes(type)) map[cat].push(type);
      return map;
    }, {} as Record<string, string[]>);
  }

  async review(dto: ReviewAutocompleteDto): Promise<AutocompleteEntry> {
    const entry = await this.entryRepo.findOne({ where: { id: dto.entryId } });
    if (!entry) throw new NotFoundException('Entry not found');

    entry.status = dto.action === ReviewAction.APPROVE
      ? EntryStatus.APPROVED
      : EntryStatus.REJECTED;

    await this.entryRepo.save(entry);

    const queueItem = await this.reviewRepo.findOne({ where: { entryId: dto.entryId } });
    if (queueItem) {
      queueItem.action = dto.action;
      queueItem.reason = dto.reason;
      queueItem.reviewedBy = dto.reviewedBy;
      queueItem.reviewedAt = new Date();
      await this.reviewRepo.save(queueItem);
    }

    // If rejected, log to rejected entries table
    if (dto.action === ReviewAction.REJECT) {
      await this.rejectedRepo.save(this.rejectedRepo.create({
        value: entry.value,
        normalized: entry.normalized,
        type: entry.type,
        reason: dto.reason,
        source: entry.source,
      }));
    }

    return entry;
  }

  async getPendingReview(): Promise<AutocompleteReviewQueue[]> {
    return this.reviewRepo.find({
      where: { action: null },
      relations: ['entry'],
      order: { createdAt: 'ASC' },
      take: 50,
    });
  }
}

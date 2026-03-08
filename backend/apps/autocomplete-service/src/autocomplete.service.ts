import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { AutocompleteEntry, EntryStatus, EntryType } from './entities/autocomplete-entry.entity';
import { AutocompleteReviewQueue, ReviewAction } from './entities/autocomplete-review-queue.entity';
import { SubmitAutocompleteDto } from './dto/submit-autocomplete.dto';
import { ReviewAutocompleteDto } from './dto/review-autocomplete.dto';
import { QueryAutocompleteDto } from './dto/query-autocomplete.dto';
import { EntryFilter } from './filters/entry.filter';

@Injectable()
export class AutocompleteService {
  constructor(
    @InjectRepository(AutocompleteEntry)
    private readonly entryRepo: Repository<AutocompleteEntry>,
    @InjectRepository(AutocompleteReviewQueue)
    private readonly reviewRepo: Repository<AutocompleteReviewQueue>,
    private readonly filter: EntryFilter,
  ) {}

  async submit(dto: SubmitAutocompleteDto): Promise<AutocompleteEntry> {
    const validation = this.filter.validate(dto.value);
    if (!validation.valid) {
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

    const entry = this.entryRepo.create({
      value: dto.value.trim(),
      normalized,
      type: dto.type,
      status: EntryStatus.PENDING,
      source: dto.source,
      frequency: 1,
    });

    const saved = await this.entryRepo.save(entry);

    // Add to review queue
    await this.reviewRepo.save(this.reviewRepo.create({ entryId: saved.id }));

    return saved;
  }

  async query(dto: QueryAutocompleteDto): Promise<AutocompleteEntry[]> {
    return this.entryRepo.find({
      where: {
        type: dto.type,
        status: EntryStatus.APPROVED,
        normalized: ILike(`%${this.filter.normalize(dto.q)}%`),
      },
      order: { frequency: 'DESC' },
      take: dto.limit ?? 10,
    });
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

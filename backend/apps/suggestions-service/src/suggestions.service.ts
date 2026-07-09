import { Injectable, OnModuleInit, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { JobTitle } from './entities/job-title.entity';
import { SuggestDto, AddJobTitleDto } from './dto/suggest.dto';

const NOISE_WORDS = [
  'crazy', 'clown', 'ninja', 'guru', 'wizard', 'rockstar', 'unicorn', 'jedi',
  'pirate', 'superhero', 'god', 'genius', 'legend', 'boss', 'overlord', 'king',
  'queen', 'master', 'lord', 'chief', 'supreme', 'ultimate', 'extreme', 'mega',
  'asdf', 'qwerty', 'lorem', 'ipsum', 'blah', 'foo', 'bar', 'baz', 'test',
  'dummy', 'fake', 'random', 'abc', 'xyz',
  'porn', 'sex', 'drug', 'hacker', 'cracker', 'scammer', 'spammer',
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Engineering': ['engineer', 'developer', 'programmer', 'architect', 'devops', 'sre', 'qa', 'tester', 'embedded'],
  'Product Management': ['product manager', 'product owner', 'scrum master', 'program manager'],
  'Design': ['designer', 'ux', 'ui', 'graphic', 'motion', 'brand', 'interaction', 'visual'],
  'Data & Analytics': ['data scientist', 'data analyst', 'data engineer', 'business analyst', 'analytics', 'bi analyst', 'intelligence'],
  'Marketing': ['marketing', 'seo', 'social media', 'growth', 'content strategist', 'email marketing', 'performance marketing'],
  'Writing & Content': ['writer', 'copywriter', 'editor', 'content', 'journalist', 'blogger'],
  'Finance': ['financial', 'accountant', 'bookkeeper', 'tax', 'auditor', 'cfo', 'controller'],
  'Legal': ['attorney', 'lawyer', 'paralegal', 'compliance', 'legal'],
  'Consulting': ['consultant', 'advisor', 'strategist'],
  'Project Management': ['project manager', 'agile coach', 'delivery manager', 'pmo'],
  'Media Production': ['video', 'videographer', 'photographer', 'audio', 'animator', 'illustrator'],
  'Healthcare': ['health', 'clinical', 'medical', 'nurse', 'physician'],
  'Education': ['instructor', 'curriculum', 'e-learning', 'teacher', 'trainer', 'tutor'],
};

const CACHE_TTL = 60_000;

@Injectable()
export class SuggestionsService implements OnModuleInit {
  private readonly logger = new Logger(SuggestionsService.name);

  constructor(
    @InjectRepository(JobTitle)
    private readonly titleRepo: Repository<JobTitle>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async onModuleInit() {
    try {
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    } catch (err) {
      this.logger.warn('pg_trgm extension may already exist or could not be created', err);
    }
    try {
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS suggestion_job_titles_trgm_idx ON suggestion_job_titles USING gin (title gin_trgm_ops)`,
      );
    } catch (err) {
      this.logger.warn('Trigram index may already exist or could not be created', err);
    }
  }

  async suggest(dto: SuggestDto): Promise<JobTitle[]> {
    const cacheKey = `suggest:${dto.q}:${dto.industry ?? ''}:${dto.goal ?? ''}:${dto.limit ?? 10}`;
    const cached = await this.cache.get<JobTitle[]>(cacheKey);
    if (cached) return cached;

    const qb = this.titleRepo
      .createQueryBuilder('jt')
      .where('jt.isActive = true')
      .andWhere('jt.title % :q', { q: dto.q })
      .orderBy('similarity(jt.title, :q)', 'DESC')
      .addOrderBy('jt.usageCount', 'DESC')
      .setParameter('q', dto.q)
      .limit(dto.limit ?? 10);

    if (dto.industry) {
      qb.andWhere('(LOWER(jt.industry) = LOWER(:industry) OR jt.industry IS NULL)', { industry: dto.industry });
    }
    if (dto.goal) {
      qb.andWhere('(LOWER(jt.goal) = LOWER(:goal) OR jt.goal IS NULL)', { goal: dto.goal });
    }

    const results = await qb.getMany();
    await this.cache.set(cacheKey, results, CACHE_TTL);
    return results;
  }

  async add(dto: AddJobTitleDto): Promise<JobTitle> {
    const normalized = dto.title.trim();
    const lower = normalized.toLowerCase();

    if (NOISE_WORDS.some(w => lower.includes(w))) {
      throw new BadRequestException('Job title contains disallowed term');
    }

    if (normalized.length < 2 || normalized.length > 200) {
      throw new BadRequestException('Job title must be between 2 and 200 characters');
    }

    // Case-insensitive duplicate detection
    const existing = await this.titleRepo
      .createQueryBuilder('jt')
      .where('LOWER(jt.title) = LOWER(:title)', { title: normalized })
      .andWhere('LOWER(COALESCE(jt.industry, \'\')) = LOWER(COALESCE(:industry, \'\'))', { industry: dto.industry ?? null })
      .getOne();

    if (existing) {
      existing.usageCount += 1;
      return this.titleRepo.save(existing);
    }

    const category = dto.category || this.categorize(lower);

    return this.titleRepo.save(
      this.titleRepo.create({
        title: normalized,
        industry: dto.industry,
        goal: dto.goal,
        category,
      }),
    );
  }

  async getByIndustry(industry: string): Promise<JobTitle[]> {
    const cacheKey = `industry:${industry.toLowerCase()}`;
    const cached = await this.cache.get<JobTitle[]>(cacheKey);
    if (cached) return cached;

    const results = await this.titleRepo
      .createQueryBuilder('jt')
      .where('LOWER(jt.industry) = LOWER(:industry)', { industry })
      .andWhere('jt.isActive = true')
      .orderBy('jt.usageCount', 'DESC')
      .limit(50)
      .getMany();

    await this.cache.set(cacheKey, results, CACHE_TTL);
    return results;
  }

  private categorize(titleLower: string): string {
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => titleLower.includes(kw))) {
        return category;
      }
    }
    return 'Other';
  }
}

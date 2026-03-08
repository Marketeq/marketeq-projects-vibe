import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JobTitle } from './entities/job-title.entity';
import { SuggestDto, AddJobTitleDto } from './dto/suggest.dto';

const NOISE_WORDS = ['crazy', 'clown', 'trainer', 'ninja', 'guru', 'wizard', 'rockstar'];

@Injectable()
export class SuggestionsService implements OnModuleInit {
  constructor(
    @InjectRepository(JobTitle)
    private readonly titleRepo: Repository<JobTitle>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // Enable pg_trgm for fuzzy matching
    await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS pg_trgm').catch(() => null);
    await this.dataSource.query(
      `CREATE INDEX IF NOT EXISTS suggestion_job_titles_trgm_idx ON suggestion_job_titles USING gin (title gin_trgm_ops)`,
    ).catch(() => null);
  }

  async suggest(dto: SuggestDto): Promise<JobTitle[]> {
    const query = this.dataSource
      .createQueryBuilder()
      .select('*')
      .from('suggestion_job_titles', 'jt')
      .where('jt.is_active = true')
      .andWhere('jt.title % :q', { q: dto.q })
      .orderBy('similarity(jt.title, :q)', 'DESC')
      .setParameter('q', dto.q)
      .limit(dto.limit ?? 10);

    if (dto.industry) {
      query.andWhere('(jt.industry = :industry OR jt.industry IS NULL)', { industry: dto.industry });
    }
    if (dto.goal) {
      query.andWhere('(jt.goal = :goal OR jt.goal IS NULL)', { goal: dto.goal });
    }

    return query.getRawMany();
  }

  async add(dto: AddJobTitleDto): Promise<JobTitle> {
    const normalized = dto.title.trim().toLowerCase();

    // Filter noise
    if (NOISE_WORDS.some(w => normalized.includes(w))) {
      throw new Error('Invalid job title');
    }

    const existing = await this.titleRepo.findOne({
      where: { title: dto.title.trim() },
    });

    if (existing) {
      existing.usageCount += 1;
      return this.titleRepo.save(existing);
    }

    return this.titleRepo.save(
      this.titleRepo.create({
        title: dto.title.trim(),
        industry: dto.industry,
        goal: dto.goal,
        category: dto.category,
      }),
    );
  }

  async getByIndustry(industry: string): Promise<JobTitle[]> {
    return this.titleRepo.find({
      where: { industry, isActive: true },
      order: { usageCount: 'DESC' },
      take: 50,
    });
  }
}

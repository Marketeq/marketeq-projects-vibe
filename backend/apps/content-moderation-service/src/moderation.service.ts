import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModerationLog, ModerationAction, ContentType } from './entities/moderation-log.entity';
import { BannedKeyword } from './entities/banned-keyword.entity';
import { ContentFilter } from './filters/content.filter';
import { ModerateContentDto, ModerateMediaDto, ReviewContentDto, LogsQueryDto, AddKeywordDto } from './dto/moderation.dto';

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(ModerationLog)
    private readonly logRepo: Repository<ModerationLog>,
    @InjectRepository(BannedKeyword)
    private readonly keywordRepo: Repository<BannedKeyword>,
    private readonly filter: ContentFilter,
  ) {}

  async moderateContent(dto: ModerateContentDto): Promise<{ status: ModerationAction; reason: string | null }> {
    const result = await this.filter.check(dto.content);
    const action = result.passed ? ModerationAction.APPROVED : ModerationAction.REJECTED;

    await this.logRepo.save(this.logRepo.create({
      contentId: dto.contentId,
      contentType: dto.contentType,
      action,
      reason: result.reason ?? null,
    }));

    return { status: action, reason: result.reason ?? null };
  }

  async moderateMedia(dto: ModerateMediaDto): Promise<{ status: ModerationAction; reason: string | null }> {
    // Cloudflare/AI integration placeholder — auto-approve for now
    // In production: call Cloudflare Images API or AWS Rekognition
    const action = ModerationAction.APPROVED;

    await this.logRepo.save(this.logRepo.create({
      contentId: dto.contentId,
      contentType: dto.contentType,
      action,
      reason: null,
      meta: { mediaUrl: dto.mediaUrl, mediaType: dto.mediaType },
    }));

    return { status: action, reason: null };
  }

  async approve(contentId: string, dto: ReviewContentDto): Promise<ModerationLog> {
    const log = await this.logRepo.save(this.logRepo.create({
      contentId,
      contentType: ContentType.PROJECT,
      action: ModerationAction.APPROVED,
      reason: dto.reason ?? null,
      moderatorId: dto.moderatorId ?? null,
    }));
    return log;
  }

  async reject(contentId: string, dto: ReviewContentDto): Promise<ModerationLog> {
    return this.logRepo.save(this.logRepo.create({
      contentId,
      contentType: ContentType.PROJECT,
      action: ModerationAction.REJECTED,
      reason: dto.reason ?? null,
      moderatorId: dto.moderatorId ?? null,
    }));
  }

  async getLogs(query: LogsQueryDto) {
    const qb = this.logRepo.createQueryBuilder('log').orderBy('log.timestamp', 'DESC');
    if (query.status) qb.andWhere('log.action = :status', { status: query.status });
    if (query.contentType) qb.andWhere('log.contentType = :contentType', { contentType: query.contentType });

    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    qb.skip((page - 1) * perPage).take(perPage);

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total, page, perPage };
  }

  async addKeyword(dto: AddKeywordDto): Promise<BannedKeyword> {
    const existing = await this.keywordRepo.findOne({ where: { keyword: dto.keyword.toLowerCase() } });
    if (existing) return existing;
    return this.keywordRepo.save(this.keywordRepo.create({ keyword: dto.keyword.toLowerCase(), category: dto.category }));
  }

  async removeKeyword(id: string): Promise<void> {
    const kw = await this.keywordRepo.findOne({ where: { id } });
    if (!kw) throw new NotFoundException('Keyword not found');
    await this.keywordRepo.remove(kw);
  }

  async getKeywords(): Promise<BannedKeyword[]> {
    return this.keywordRepo.find({ order: { createdAt: 'ASC' } });
  }
}

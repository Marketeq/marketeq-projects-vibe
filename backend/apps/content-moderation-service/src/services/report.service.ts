import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModerationLog } from '../entities/moderation-log.entity';

@Injectable()
export class ModerationReportService {
  constructor(
    @InjectRepository(ModerationLog)
    private readonly logRepo: Repository<ModerationLog>,
  ) {}

  async generateViolationSummary(
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    return this.logRepo
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN log.reason ILIKE '%profanity%' THEN 1 ELSE 0 END)",
        'profanityCount',
      )
      .addSelect(
        "SUM(CASE WHEN log.reason ILIKE '%explicit%' THEN 1 ELSE 0 END)",
        'explicitContentCount',
      )
      .addSelect(
        "SUM(CASE WHEN log.reason ILIKE '%banned%' OR log.reason ILIKE '%keyword%' THEN 1 ELSE 0 END)",
        'bannedKeywordCount',
      )
      .addSelect(
        "SUM(CASE WHEN log.reason ILIKE '%spam%' THEN 1 ELSE 0 END)",
        'spamCount',
      )
      .where('log.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('log.action')
      .getRawMany();
  }

  async generateEfficiencyReport(
    startDate: string,
    endDate: string,
  ): Promise<{
    totalModerated: number;
    approved: number;
    rejected: number;
    flagged: number;
    approvalRate: number;
    rejectionRate: number;
  }> {
    const stats = await this.logRepo
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('log.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('log.action')
      .getRawMany();

    const counts: Record<string, number> = {};
    let total = 0;
    for (const row of stats) {
      counts[row.action] = parseInt(row.count, 10);
      total += counts[row.action];
    }

    return {
      totalModerated: total,
      approved: counts['approved'] ?? 0,
      rejected: counts['rejected'] ?? 0,
      flagged: counts['flagged'] ?? 0,
      approvalRate: total ? ((counts['approved'] ?? 0) / total) * 100 : 0,
      rejectionRate: total ? ((counts['rejected'] ?? 0) / total) * 100 : 0,
    };
  }

  async getContentTypBreakdown(
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    return this.logRepo
      .createQueryBuilder('log')
      .select('log.contentType', 'contentType')
      .addSelect('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('log.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('log.contentType')
      .addGroupBy('log.action')
      .getRawMany();
  }
}

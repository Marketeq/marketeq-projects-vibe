import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './reports.entity';
import { User } from '../user/entities/user.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportsRepository: Repository<Report>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private toDto(row: Report, wasAlreadyReported = false): ReportDto {
    return {
      id: row.id,
      reporterId: row.reporterId,
      reportedId: row.reportedId,
      reason: row.reason,
      contextThreadId: row.contextThreadId,
      contextMessageId: row.contextMessageId,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      wasAlreadyReported,
    };
  }

  async report(
    reporterId: string,
    reportedId: string,
    dto: CreateReportDto,
  ): Promise<ReportDto> {
    if (reporterId === reportedId) {
      throw new BadRequestException('Cannot report yourself');
    }

    const target = await this.userRepository.findOne({
      where: { id: reportedId },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    const contextThreadId = dto.contextThreadId ?? null;
    const contextMessageId = dto.contextMessageId ?? null;

    const row = this.reportsRepository.create({
      reporterId,
      reportedId,
      reason: dto.reason,
      contextThreadId,
      contextMessageId,
    });

    try {
      const saved = await this.reportsRepository.save(row);
      return this.toDto(saved);
    } catch (err: any) {
      if (err?.code !== '23505') throw err;
      const existing = await this.findExisting(
        reporterId,
        reportedId,
        contextMessageId,
        contextThreadId,
      );
      if (!existing) throw err;
      return this.toDto(existing, true);
    }
  }

  private async findExisting(
    reporterId: string,
    reportedId: string,
    contextMessageId: string | null,
    contextThreadId: string | null,
  ): Promise<Report | null> {
    const qb = this.reportsRepository
      .createQueryBuilder('r')
      .where('r."reporterId" = :reporterId', { reporterId })
      .andWhere('r."reportedId" = :reportedId', { reportedId });

    if (contextMessageId) {
      qb.andWhere('r."contextMessageId" = :contextMessageId', {
        contextMessageId,
      });
    } else if (contextThreadId) {
      qb.andWhere('r."contextThreadId" = :contextThreadId', { contextThreadId });
      qb.andWhere('r."contextMessageId" IS NULL');
    } else {
      qb.andWhere('r."contextThreadId" IS NULL');
      qb.andWhere('r."contextMessageId" IS NULL');
    }

    return qb.orderBy('r."createdAt"', 'ASC').getOne();
  }
}

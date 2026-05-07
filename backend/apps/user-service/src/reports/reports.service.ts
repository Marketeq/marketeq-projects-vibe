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

  private toDto(row: Report): ReportDto {
    return {
      id: row.id,
      reporterId: row.reporterId,
      reportedId: row.reportedId,
      reason: row.reason,
      contextThreadId: row.contextThreadId,
      contextMessageId: row.contextMessageId,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
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

    const row = this.reportsRepository.create({
      reporterId,
      reportedId,
      reason: dto.reason,
      contextThreadId: dto.contextThreadId ?? null,
      contextMessageId: dto.contextMessageId ?? null,
    });

    const saved = await this.reportsRepository.save(row);
    return this.toDto(saved);
  }
}

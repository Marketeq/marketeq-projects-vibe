import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { EarningsCache } from '../entities/earnings-cache.entity';
import { ContractLabelCache } from '../entities/contract-label-cache.entity';
import { CurrencyService } from '../currency/currency.service';
import { buildCsv } from './csv.builder';
import { buildPdf } from './pdf.builder';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class ExportQueryDto {
  @IsOptional()
  @IsIn(['csv', 'pdf'])
  format?: string;

  @IsOptional()
  @IsString()
  dateRange?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  entryType?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

@Injectable()
export class ExportService {
  private readonly syncLimit: number;
  private readonly asyncMax: number;

  constructor(
    private readonly config: ConfigService,
    private readonly currencySvc: CurrencyService,
    @InjectRepository(EarningsCache) private readonly ecRepo: Repository<EarningsCache>,
    @InjectRepository(ContractLabelCache) private readonly lblRepo: Repository<ContractLabelCache>,
  ) {
    this.syncLimit = parseInt(this.config.get('EXPORT_SYNC_ROW_LIMIT', '5000'), 10);
    this.asyncMax  = parseInt(this.config.get('EXPORT_ASYNC_MAX_ROWS', '500000'), 10);
  }

  async export(contractorId: string, query: ExportQueryDto, res: Response): Promise<void> {
    const count = await this.countRows(contractorId, query);

    if (count > this.asyncMax) {
      throw new BadRequestException(
        `Export exceeds maximum row limit of ${this.asyncMax}. Narrow your date range or apply filters.`);
    }

    if (count >= this.syncLimit) {
      // Async path — would queue a Bull job with R2 upload
      // For now, return 202 with job info
      res.status(202).json({
        jobId: require('crypto').randomUUID(),
        status: 'queued', estimatedRows: count,
        message: 'Your export is being prepared. You will receive a download link by notification when it is ready.',
      });
      return;
    }

    // Sync path
    const { buffer, filename } = await this.buildFile(contractorId, query);
    const contentType = query.format === 'pdf' ? 'application/pdf' : 'text/csv';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('X-Row-Count', String(count));
    res.setHeader('X-Export-Mode', 'sync');
    res.status(200).end(buffer);
  }

  async buildFile(contractorId: string, query: ExportQueryDto): Promise<{buffer: Buffer; filename: string}> {
    const rows = await this.fetchRows(contractorId, query);
    const labels = await this.fetchLabels(rows);
    const dispAmts = await this.buildDisplayAmounts(rows, query.currency ?? 'USD');
    const exportedAt = new Date();
    const filename = `earnings-${exportedAt.toISOString().slice(0, 10)}.${query.format ?? 'csv'}`;

    let buffer: Buffer;
    if (query.format === 'pdf') {
      buffer = await buildPdf({ rows, labels, displayCurrency: query.currency ?? 'USD',
        displayAmounts: dispAmts, dateRangeLabel: query.dateRange ?? 'all_time', exportedAt });
    } else {
      buffer = buildCsv({rows, labels, displayCurrency: query.currency ?? 'USD',
        displayAmounts: dispAmts, exportedAt });
    }
    return { buffer, filename };
  }

  private async countRows(contractorId: string, query: ExportQueryDto): Promise<number> {
    const qb = this.ecRepo.createQueryBuilder('ec')
      .where('ec.contractorId = :id', { id: contractorId });
    this.applyFilters(qb, query);
    return qb.getCount();
  }

  private async fetchRows(contractorId: string, query: ExportQueryDto): Promise<EarningsCache[]> {
    const qb = this.ecRepo.createQueryBuilder('ec')
      .where('ec.contractorId = :id', { id: contractorId })
      .orderBy('ec.workStartAt', 'ASC');
    this.applyFilters(qb, query);
    return qb.getMany();
  }

  private applyFilters(qb: any, query: ExportQueryDto): void {
    if (query.startDate) qb.andWhere('ec.workStartAt >= :from', { from: query.startDate });
    if (query.endDate) qb.andWhere('ec.workStartAt <= :to', { to: query.endDate + 'T23:59:59Z' });
    if (query.projectId) qb.andWhere('ec.projectId = :pid', { pid: query.projectId });
    if (query.entryType) qb.andWhere('ec.entryType = :et', { et: query.entryType === 'automated' ? 'screenshot' : 'manual' });
    if (query.status) qb.andWhere('ec.status = :st', { st: query.status === 'paid' ? 'confirmed' : query.status === 'failed' ? 'reversed' : query.status });
  }

  private async fetchLabels(rows: EarningsCache[]): Promise<Map<string, ContractLabelCache>> {
    const ids = [...new Set(rows.map(r => r.contractId).filter(Boolean))] as string[];
    if (!ids.length) return new Map();
    const lbls = await this.lblRepo.findBy(ids.map(id => ({ contractId: id })));
    return new Map(lbls.map(l => [l.contractId, l]));
  }

  private async buildDisplayAmounts(rows: EarningsCache[], currency: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const row of rows) {
      const r = await this.currencySvc.convertFromUsd(row.netAmountUsd, currency);
      map.set(row.id, r.amount);
    }
    return map;
  }
}

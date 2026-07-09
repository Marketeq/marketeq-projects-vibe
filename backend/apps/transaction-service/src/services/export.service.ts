import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ExportRequestDto } from '../dto/export.dto';
import { TransactionService } from './transaction.service';
import { InvoiceService } from './invoice.service';
import { AuditService } from './audit.service';

@Injectable()
export class ExportService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly invoiceService: InvoiceService,
    private readonly auditService: AuditService,
  ) {}

  async triggerExport(
    userId: string,
    dto: ExportRequestDto,
  ): Promise<{
    buffer?: Buffer;
    filename?: string;
    queued: boolean;
    message?: string;
    estimatedRecords?: number;
  }> {
    // Count records matching filters before generating
    const count =
      dto.scope === 'transactions'
        ? await this.transactionService.countFiltered(userId, dto as any)
        : await this.invoiceService.countFiltered(userId, dto as any);

    if (count === 0) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE_VIOLATION',
        message:
          'There is nothing to export. Try adjusting your filters to include more transactions.',
      });
    }

    // Synchronous export for small datasets
    const SYNC_THRESHOLD = 1000;
    if (count <= SYNC_THRESHOLD) {
      return this.generateSyncExport(userId, dto);
    }

    // Async export — queue job, notify user via email when ready
    await this.queueAsyncExport(userId, dto, count);
    return {
      queued: true,
      message:
        'Your export is too large to download instantly. We will email it to you when it is ready.',
      estimatedRecords: count,
    };
  }

  private async generateSyncExport(
    userId: string,
    dto: ExportRequestDto,
  ): Promise<{ buffer: Buffer; filename: string; queued: boolean }> {
    const filename = `${dto.scope}-export-${new Date().toISOString().split('T')[0]}.${dto.format}`;

    const buffer =
      dto.format === 'csv'
        ? await this.generateCsv(userId, dto)
        : await this.generatePdf(userId, dto);

    await this.auditService.log({
      action: 'EXPORT',
      userId,
      scope: dto.scope,
      format: dto.format,
    });

    return { buffer, filename, queued: false };
  }

  private async queueAsyncExport(
    userId: string,
    dto: ExportRequestDto,
    count: number,
  ): Promise<void> {
    // Async export queue implementation covered in Doc 06
    await this.auditService.log({
      action: 'EXPORT',
      userId,
      scope: dto.scope,
      format: dto.format,
      metadata: { queued: true, estimatedRecords: count },
    });
  }

  private async generateCsv(
    _userId: string,
    _dto: ExportRequestDto,
  ): Promise<Buffer> {
    // Full CSV generation implementation covered in Doc 05
    return Buffer.from('id,date,amount\n');
  }

  private async generatePdf(
    _userId: string,
    _dto: ExportRequestDto,
  ): Promise<Buffer> {
    // Full PDF generation implementation covered in Doc 05
    return Buffer.from('%PDF placeholder');
  }
}
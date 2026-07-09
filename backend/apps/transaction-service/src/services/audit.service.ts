import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
 
export interface AuditLogEntry {
  action: 'VIEW_TRANSACTION_DETAIL' | 'VIEW_INVOICE_DETAIL' |
          'DOWNLOAD_RECEIPT' | 'EXPORT' | 'REPORT_TRANSACTION';
  userId: string;
  transactionId?: string;
  invoiceId?: string;
  scope?: string;
  format?: string;
  metadata?: Record<string, unknown>;
}
 
@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditService');
 
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}
 
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.auditRepo.save(entry);
    } catch (err) {
      // Audit failures must never crash the primary request
      this.logger.error('Audit log write failed', err);
    }
  }
}

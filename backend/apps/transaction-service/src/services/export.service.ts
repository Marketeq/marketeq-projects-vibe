import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Transaction } from '../entities/transaction.entity'
import { Invoice } from '../entities/invoice.entity'
import { AuditLog, AuditAction } from '../entities/audit-log.entity'

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name)

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async exportTransactionsCsv(userId: string): Promise<string> {
    const transactions = await this.txRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    })

    if (transactions.length === 0) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'No transactions to export.',
      })
    }

    const headers = 'ID,Type,Status,Direction,Amount,Currency,Fee,Description,Date\n'
    const rows = transactions.map(tx =>
      [
        tx.id,
        tx.type,
        tx.status,
        tx.direction,
        tx.amount,
        tx.currency,
        tx.fee ?? '',
        (tx.description ?? '').replace(/,/g, ' '),
        tx.createdAt.toISOString(),
      ].join(','),
    ).join('\n')

    await this.auditRepo.save({
      userId,
      resourceType: 'transaction',
      resourceId: null,
      action: AuditAction.EXPORT,
      metadata: { format: 'csv', count: transactions.length },
    })

    return headers + rows
  }

  async exportInvoicesCsv(userId: string): Promise<string> {
    const invoices = await this.invoiceRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    })

    if (invoices.length === 0) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'No invoices to export.',
      })
    }

    const headers = 'ID,InvoiceNumber,Status,Amount,Currency,DueDate,PaidAt,Date\n'
    const rows = invoices.map(inv =>
      [
        inv.id,
        inv.invoiceNumber,
        inv.status,
        inv.amount,
        inv.currency,
        inv.dueDate?.toISOString() ?? '',
        inv.paidAt?.toISOString() ?? '',
        inv.createdAt.toISOString(),
      ].join(','),
    ).join('\n')

    await this.auditRepo.save({
      userId,
      resourceType: 'invoice',
      resourceId: null,
      action: AuditAction.EXPORT,
      metadata: { format: 'csv', count: invoices.length },
    })

    return headers + rows
  }
}

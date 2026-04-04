import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { Invoice }     from '../entities/invoice.entity';

export interface ShareContextPayload {
  itemType:        'transaction' | 'invoice';
  itemId:          string;
  contextLabel:    string;  // Line shown in the share modal below the headline
  referenceNumber: string;
}

@Injectable()
export class ShareService {
  constructor(
    @InjectRepository(Transaction) private readonly txnRepo: Repository<Transaction>,
    @InjectRepository(Invoice)     private readonly invRepo: Repository<Invoice>,
  ) {}

  async getTransactionContext(id: string, userId: string): Promise<ShareContextPayload> {
    const txn = await this.txnRepo.findOne({ where: { id, userId } });
    if (!txn) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Transaction not found.' });

    const typeLabel = txn.descriptionType.replace(/_/g, ' ');
    const detail    = txn.descriptionProjectName
      ? typeLabel + ' for ' + txn.descriptionProjectName +
        (txn.descriptionBillingPeriod ? ', ' + txn.descriptionBillingPeriod : '')
      : typeLabel + ' -- ' + txn.descriptionContractorHandle;

    // Example: 'Sharing Transaction #1234567890 -- monthly installment for UX Audit, November 2025'
    return {
      itemType:        'transaction',
      itemId:          id,
      contextLabel:    'Sharing Transaction #' + txn.transactionId + ' -- ' + detail,
      referenceNumber: txn.transactionId,
    };
  }

  async getInvoiceContext(id: string, userId: string): Promise<ShareContextPayload> {
    const inv = await this.invRepo.findOne({ where: { id, userId } });
    if (!inv) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Invoice not found.' });

    const detail = inv.descriptionType +
      (inv.descriptionBillingPeriod ? ', ' + inv.descriptionBillingPeriod : '');

    // Example: 'Sharing Invoice INV-2023-001 -- Monthly installment, November 2025'
    return {
      itemType:        'invoice',
      itemId:          id,
      contextLabel:    'Sharing Invoice ' + inv.invoiceId + ' -- ' + detail,
      referenceNumber: inv.invoiceId,
    };
  }
}
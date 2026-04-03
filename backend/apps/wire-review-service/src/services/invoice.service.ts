import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { QuickBooksService } from './quickbooks.service';
import { SyncLog } from '../entities/sync-log.entity';

interface CreateInvoiceInput {
  clientId: string;
  amount: number;
  paymentMethod: 'wire' | 'stripe' | 'wallet';
  status?: 'PENDING_WIRE' | 'PAID' | 'CANCELLED';
}

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(SyncLog)
    private readonly syncLogRepo: Repository<SyncLog>,
    private readonly quickbooksService: QuickBooksService,
  ) {}

  async create(data: CreateInvoiceInput): Promise<Invoice> {
    const invoice = this.invoiceRepo.create({
      clientId: data.clientId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      status: data.status || 'PENDING_WIRE',
    });

    const saved = await this.invoiceRepo.save(invoice);

    // TODO: replace with real user resolution logic
    //const user = await this.userService.getById(clientId);
    const mockUserData = {
      displayName: 'Test User 5',
      email: 'test_user5@marketeq.com',
    };

    let qbInvoiceId: string | null = null;
    try {
      qbInvoiceId = await this.quickbooksService.createInvoiceInQuickBooks({
        amount: saved.amount,
        clientId: saved.clientId,
        invoiceId: saved.id,
        displayName: mockUserData.displayName,
        email: mockUserData.email,
      });
    } catch (err) {
      await this.syncLogRepo.save({
        invoiceReference: saved.id,
        verified: false,
        verifiedAt: new Date(),
        rawResponse: {
          error: true,
          message: 'QuickBooks API failed to create invoice',
          details: err?.response?.data || err.message,
        },
      });
      throw err;
    }
   /*  const qbInvoiceId = await this.quickbooksService.createInvoiceInQuickBooks({
      amount: saved.amount,
      clientId: saved.clientId,
      invoiceId: saved.id,
      displayName: mockUserData.displayName,
      email: mockUserData.email,
    }); */

    await this.invoiceRepo.update(saved.id, { qbInvoiceId });

    return { ...saved, qbInvoiceId };
  }

  async markAsPaid(invoiceId: string): Promise<void> {
    // Optionally, add clientId as a parameter if you want to verify ownership
    // Example: async markAsPaid(invoiceId: string, clientId?: string): Promise<void> { ... }
   /*  if (clientId) {
      const invoice = await this.invoiceRepo.findOneBy({ id: invoiceId });
      if (!invoice || invoice.clientId !== clientId) {
        throw new Error('Invoice-client mismatch. Verification failed.');
      }
    } */

    await this.invoiceRepo.update(invoiceId, {
      status: 'PAID',
    });
  }
}

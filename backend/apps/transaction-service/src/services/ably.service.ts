import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Ably from 'ably';
import { TransactionStatus } from '../entities/enums';

@Injectable()
export class AblyService implements OnModuleInit {
  private readonly logger = new Logger('AblyService');
  private client!: Ably.Rest;
  private enabled = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const key = this.config.get<string>('ABLY_API_KEY');
    if (!key || key === 'test-key' || key === 'change-me') {
      this.logger.warn('Ably is disabled: no valid ABLY_API_KEY provided');
      return;
    }
    try {
      this.client  = new Ably.Rest({ key });
      this.enabled = true;
    } catch (err) {
      this.logger.warn('Ably initialization failed: ' + err);
    }
  }

  async publishStatusUpdate(
    userId:        string,
    transactionId: string,
    newStatus:     TransactionStatus,
  ): Promise<void> {
    if (!this.enabled) return;
    try {
      const channel = this.client.channels.get('transactions:' + userId);
      await channel.publish('transaction.status.changed', {
        transactionId,
        newStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error('Ably publish failed for user ' + userId, err);
    }
  }

  async publishInvoiceStatusUpdate(
    userId:    string,
    invoiceId: string,
    newStatus: string,
  ): Promise<void> {
    if (!this.enabled) return;
    try {
      const channel = this.client.channels.get('invoices:' + userId);
      await channel.publish('invoice.status.changed', {
        invoiceId,
        newStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error('Ably invoice publish failed for user ' + userId, err);
    }
  }
}
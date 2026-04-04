import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, In } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceStatus } from '../entities/enums';
import { MetricsService } from './metrics.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger('SchedulerService');

  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    private readonly metrics: MetricsService,
    private readonly config:  ConfigService,
  ) {}

  // ── 7.1 Overdue Invoice Escalation  (1:00 AM UTC daily) ───────────
  @Cron('0 1 * * *', { name: 'overdue-invoice-escalation', timeZone: 'UTC' })
  async escalateOverdueInvoices(): Promise<void> {
    const start = Date.now();
    this.logger.log('Overdue invoice escalation started');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await this.invoiceRepo.update(
        {
          dueDate: LessThan(today),
          status:  Not(In([
            InvoiceStatus.PAID,
            InvoiceStatus.PARTIALLY_PAID,
            InvoiceStatus.CANCELLED,        // ← ADDED
          ])),
        },
        { status: InvoiceStatus.OVERDUE, updatedAt: new Date() },
      );

      const count = result.affected ?? 0;
      this.metrics.overdueInvoicesTotal.inc(count);
      this.logger.log('Overdue invoice escalation completed', {
        invoicesUpdated: count,
        durationMs:      Date.now() - start,
      });
    } catch (err) {
      this.logger.error('Overdue invoice escalation failed', { error: String(err) });
    }
  }

  // ── 7.2 DLQ Depth Poller  (every 60 seconds) ──────────────────────
  @Cron('*/1 * * * *', { name: 'dlq-depth-poller' })
  async pollDlqDepths(): Promise<void> {
    const queues = [
      'txn-svc.billing.events.dlq',
      'txn-svc.timetracking.events.dlq',
      'txn-svc.payout.events.dlq',
    ];

    for (const queue of queues) {
      try {
        const url = this.config.get<string>('RABBITMQ_MANAGEMENT_URL')
          + '/api/queues/%2F/' + queue;

        const res = await fetch(url, {
          headers: {
            Authorization: 'Basic ' + Buffer.from(
              this.config.get<string>('RABBITMQ_USER') + ':' +
              this.config.get<string>('RABBITMQ_PASSWORD'),
            ).toString('base64'),
          },
        });

        // Cast to Record to avoid TS2339 on unknown response shape
        const data = await res.json() as Record<string, unknown>;
        this.metrics.dlqDepth.set({ queue }, (data['messages'] as number) ?? 0);
      } catch (err) {
        this.logger.warn('DLQ depth poll failed for ' + queue, { error: String(err) });
      }
    }
  }
}
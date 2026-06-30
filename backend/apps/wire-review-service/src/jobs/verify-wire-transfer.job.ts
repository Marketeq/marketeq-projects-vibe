//Delete this job we have implemented webhook for same now
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { QuickBooksService } from '../services/quickbooks.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { WireTransfer } from '../entities/wire-transfer.entity';
//import { ProjectService } from '../services/project.service';
//import { NotificationService } from '../services/notification.service';
//import { BadgeService } from '../services/badge.service';
//import { UserService } from '../services/user.service';
import { Invoice } from '../entities/invoice.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SyncLog } from '../entities/sync-log.entity';
import { InvoiceService } from '../services/invoice.service';

@Injectable()
export class VerifyWireTransferJob {
  private readonly logger = new Logger(VerifyWireTransferJob.name);

  constructor(
    private readonly quickBooksService: QuickBooksService,
    //private readonly projectService: ProjectService,
    //private readonly notificationService: NotificationService,
    //private readonly badgeService: BadgeService,
    //private readonly userService: UserService,
    private readonly invoiceService: InvoiceService,
    @InjectRepository(WireTransfer)
    private readonly wireTransferRepo: Repository<WireTransfer>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(SyncLog)
    private readonly syncLogRepo: Repository<SyncLog>
  ) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  async handle() {
    let invoices: any[];
    try {
      invoices = await this.quickBooksService.fetchPaidInvoices();
    } catch (err: any) {
      this.logger.warn(`Wire verification skipped: ${err.message}`);
      return;
    }

    for (const qbInvoice of invoices) {
      const wire = await this.wireTransferRepo.findOne({
        where: { qbInvoiceId: qbInvoice.Id, status: 'pending' },
      });

      // Log sync attempt
      await this.syncLogRepo.save(this.syncLogRepo.create({
        invoiceReference: qbInvoice.Id,
        verified: !!wire && Number(qbInvoice.TotalAmt) >= Number(wire?.expectedAmount),
        verifiedAt: new Date(),
        rawResponse: qbInvoice,
        source: 'cron',
      }));

      if (!wire) continue;
     //const platformEmail = await this.userService.getEmail(wire.clientId); 
     const platformEmail = 'test4@marketeq.com'; // Replace with userService.getEmail(wire.clientId)
      const qbEmail = qbInvoice.BillEmail?.Address || null;
      if (!qbEmail || qbEmail.toLowerCase() !== platformEmail.toLowerCase()) {
        this.logger.warn(`Email mismatch for invoice ${qbInvoice.Id}: QBO=${qbEmail}, Platform=${platformEmail}`);
        await this.wireTransferRepo.update(wire.id, { status: 'failed' });//Email to user if failed
        continue;
      }

      const amountMatches = Number(qbInvoice.TotalAmt) === Number(wire.expectedAmount);
      if (!amountMatches) {
        this.logger.warn(`Amount mismatch for invoice ${qbInvoice.Id}: QBO=${qbInvoice.TotalAmt}, Platform=${wire.expectedAmount}`);
        await this.wireTransferRepo.update(wire.id, { status: 'failed' });
        continue;
      }

  /*  //if above gave any errors use this logic this is working but not verifying email so for that above logic we implemented   
      // Check for underpayment
      if (Number(qbInvoice.TotalAmt) < Number(wire.expectedAmount)) {
        this.logger.warn(`Underpayment detected for invoice ${qbInvoice.Id}: paid ${qbInvoice.TotalAmt}, expected ${wire.expectedAmount}`);
        await this.wireTransferRepo.update(wire.id, {
          status: 'failed',
        });
        continue;
      } */

      if (wire.status === 'confirmed' && wire.confirmedBy !== 'QuickBooks Sync') {
        throw new ForbiddenException('Only QuickBooks Sync job may confirm wire transfers.');
      }  

      await this.wireTransferRepo.update(wire.id, {
        status: 'confirmed',
        receivedAt: new Date(qbInvoice.MetaData.LastUpdatedTime),
        confirmedBy: 'QuickBooks Sync',
      });

      await this.invoiceRepo.update({ id: wire.invoiceId }, { status: 'PAID' });
      //await this.invoiceService.markAsPaid(wire.invoiceId, wire.clientId); => this is for above line when you integrate the user service then use this logic this is just verifying invoiceId with clientId
      //await this.projectService.activateProjectByInvoiceId(wire.invoiceId);
      //await this.badgeService.assignPaymentVerifiedBadge(wire.clientId);
      //await this.notificationService.send('wire_payment_confirmed', wire.clientId);

      this.logger.log(`Wire confirmed for invoice ${wire.invoiceId}`);
    }

    // Auto-expire logic for pending wires older than 5 business days
    try {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const expired = await this.wireTransferRepo.find({
        where: { status: 'pending', createdAt: LessThan(fiveDaysAgo) },
      });

      for (const wire of expired) {
        await this.wireTransferRepo.update(wire.id, { status: 'failed' });
        this.logger.warn(`Wire transfer expired for invoice ${wire.invoiceId}`);
      }
    } catch (err: any) {
      this.logger.warn(`Wire expiry check skipped: ${err.message}`);
    }
  }
}


// research how we can do this in real time no job needed


// mercury integration try if there is any API 
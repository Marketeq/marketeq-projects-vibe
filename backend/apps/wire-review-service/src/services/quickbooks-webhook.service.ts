import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { SyncLog } from '../entities/sync-log.entity';
import { WireTransfer } from '../entities/wire-transfer.entity';
import { QuickBooksService } from './quickbooks.service'; // Ensure this path is correct

@Injectable()
export class QuickBooksWebhookService {
  private readonly logger = new Logger(QuickBooksWebhookService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(SyncLog)
    private readonly syncLogRepo: Repository<SyncLog>,
    @InjectRepository(WireTransfer)
    private readonly wireTransferRepo: Repository<WireTransfer>,
    private readonly quickBooksService: QuickBooksService,
  ) {}

  /**
   * Processes incoming webhooks from QuickBooks.
   * This method is specifically designed to identify and handle 'Payment' events
   * that result in an invoice being fully paid. Other event types are logged and skipped.
   *
   * @param headers The HTTP headers from the webhook request.
   * @param payload The JSON payload from the QuickBooks webhook.
   */
  async processWebhook(headers: any, payload: any): Promise<void> {
    // Extract relevant information from the webhook payload
    const eventNotification = payload?.eventNotifications?.[0];
    const realmId = eventNotification?.realmId; // QuickBooks company ID
    const dataChangeEvent = eventNotification?.dataChangeEvent;
    const entity = dataChangeEvent?.entities?.[0]; // The primary entity that triggered the webhook

    // Basic validation of the webhook payload structure
    if (!entity || !entity.name || !entity.id) {
      this.logger.warn(`Unrecognized or incomplete QuickBooks webhook payload received: ${JSON.stringify(payload)}`);
      return;
    }

    const entityType = entity.name; // e.g., 'Invoice', 'Payment', 'Customer'
    const entityId = entity.id;     // The ID of the entity (e.g., Invoice ID, Payment ID)
    const operation = entity.operation; // e.g., 'Create', 'Update', 'Delete'

    this.logger.log(`Received QuickBooks webhook for Entity Type: ${entityType}, ID: ${entityId}, Operation: ${operation}, Realm ID: ${realmId}`);

    let qbInvoiceId: string | null = null;
    let isInvoiceFullyPaid = false;
    let qbInvoiceBalance: number | null = null;

    // Use a switch statement to handle different entity types
    switch (entityType) {
      case 'Payment':
        // This is the ONLY event type we are interested in for marking invoices as paid.
        // When a payment is made, QuickBooks sends a 'Payment' event.
        this.logger.debug(`Processing 'Payment' event for Payment ID: ${entityId}`);

        try {
          // Fetch the full details of the Payment from QuickBooks
          // Ensure your quickBooksService.fetchPaymentDetails method accepts 'realmId' as a parameter.
          const paymentDetails = await this.quickBooksService.fetchPaymentDetails(entityId, realmId);
          const payment = paymentDetails?.Payment;

          if (!payment) {
            this.logger.warn(`Could not retrieve Payment details for ID: ${entityId}. Skipping.`);
            return;
          }

          this.logger.debug(`Fetched Payment details: ${JSON.stringify(payment, null, 2)}`);

          // Payments can be linked to multiple transactions. We need to iterate through payment lines.
          // The LinkedTxn array is nested inside each Line object.
          let foundLinkedInvoice = false;
          if (payment.Line && Array.isArray(payment.Line)) {
            for (const line of payment.Line) {
              if (line.LinkedTxn && Array.isArray(line.LinkedTxn)) {
                const linkedInvoiceTxn = line.LinkedTxn.find(
                  (txn: any) => txn.TxnType === 'Invoice'
                );

                if (linkedInvoiceTxn) {
                  qbInvoiceId = linkedInvoiceTxn.TxnId;
                  foundLinkedInvoice = true;
                  this.logger.log(`Payment ${entityId} is linked to Invoice ID: ${qbInvoiceId} via line item. Verifying invoice status.`);

                  // Now, fetch the latest details of the linked Invoice to confirm its balance
                  // Ensure your quickBooksService.fetchInvoiceDetails method accepts 'realmId' as a parameter.
                  const invoiceDetails = await this.quickBooksService.fetchInvoiceDetails(qbInvoiceId!);
                  const invoice = invoiceDetails?.Invoice;

                  if (invoice) {
                    qbInvoiceBalance = parseFloat(invoice.Balance);
                    // An invoice is considered fully paid if its balance is effectively zero.
                    // Using a small epsilon (e.g., 0.01) to account for potential floating-point inaccuracies.
                    isInvoiceFullyPaid = qbInvoiceBalance <= 0.01;

                    if (isInvoiceFullyPaid) {
                      this.logger.log(`Invoice ${qbInvoiceId} confirmed as fully paid (Balance: ${qbInvoiceBalance}).`);
                    } else {
                      this.logger.warn(`Invoice ${qbInvoiceId} is linked to Payment ${entityId}, but its balance (${qbInvoiceBalance}) is still greater than zero. Not marking as paid yet.`);
                    }
                  } else {
                    this.logger.warn(`Could not retrieve Invoice details for ID: ${qbInvoiceId} linked to Payment ${entityId}.`);
                  }
                  // Break from the loop once a linked invoice is found and processed
                  break;
                }
              }
            }
          }

          if (!foundLinkedInvoice) {
            this.logger.warn(`Payment ${entityId} is not linked to any Invoice transaction within its line items. Skipping.`);
          }
        } catch (error) {
          this.logger.error(`Error processing 'Payment' event for ID ${entityId}: ${error.message}`, error.stack);
          return; // Exit on error
        }
        break;

      default:
        // Any other entity type (like 'Invoice', 'Customer', etc.) will fall here.
        // We log it and skip processing, as the goal is only to listen for full payments.
        this.logger.log(`Received unhandled QuickBooks entity type: ${entityType}. Skipping processing for marking invoices as paid.`);
        return; // Exit if it's an unhandled entity type
    }

    // --- Common logic to update internal DB only if an invoice is identified and fully paid ---
    if (!qbInvoiceId || !isInvoiceFullyPaid) {
      this.logger.log(`No fully paid invoice identified from this webhook event. Skipping DB update.`);
      return;
    }

    // Find the corresponding internal invoice in your database
    const internalInvoice = await this.invoiceRepo.findOne({ where: { qbInvoiceId: qbInvoiceId } });

    // Log the synchronization attempt
    await this.syncLogRepo.save({
      invoiceReference: qbInvoiceId,
      verified: !!internalInvoice, // Indicates if a matching internal invoice was found
      verifiedAt: new Date(),
      rawResponse: payload, // Store the raw webhook payload for auditing
      source: 'webhook',
      // You might want to add more context to the sync log, e.g., entityType, entityId, operation
    });

    if (!internalInvoice) {
      this.logger.warn(`No matching internal invoice found for QuickBooks invoice ID: ${qbInvoiceId}. Sync log recorded.`);
      return;
    }

    // Prevent redundant updates if the invoice is already marked as paid
    if (internalInvoice.status === 'PAID') {
      this.logger.log(`Internal invoice ${internalInvoice.id} for QB Invoice ${qbInvoiceId} is already marked as PAID. Skipping update.`);
      return;
    }

    // Update the internal invoice status to 'PAID'
    internalInvoice.status = 'PAID';
    // The 'paidAt' property is commented out here because it does not exist on your current Invoice entity type.
    // If you wish to use 'paidAt', you need to add 'paidAt?: Date;' to your Invoice entity definition (invoice.entity.ts).
    // internalInvoice.paidAt = new Date(); // Record the time it was marked paid
    await this.invoiceRepo.save(internalInvoice);
    this.logger.log(`Internal invoice ${internalInvoice.id} for QB Invoice ${qbInvoiceId} successfully marked as PAID.`);

    // Check for and update associated wire transfer status if applicable
    const wire = await this.wireTransferRepo.findOne({ where: { invoiceId: internalInvoice.id } });
    if (wire && wire.status === 'pending') {
      wire.status = 'confirmed';
      wire.confirmedBy = 'QuickBooks Webhook'; // Indicate the source of confirmation
      wire.receivedAt = new Date(); // Update the received timestamp
      await this.wireTransferRepo.save(wire);
      this.logger.log(`Wire transfer ${wire.id} linked to invoice ${internalInvoice.id} confirmed via QuickBooks webhook.`);
    } else if (wire && wire.status === 'confirmed') {
        this.logger.log(`Wire transfer ${wire.id} linked to invoice ${internalInvoice.id} is already confirmed. Skipping update.`);
    } else if (!wire) {
        this.logger.log(`No pending wire transfer found for internal invoice ${internalInvoice.id}.`);
    }

    this.logger.log(`QuickBooks Webhook processing completed for QB Invoice ID: ${qbInvoiceId}.`);
  }
}



/* 
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { SyncLog } from '../entities/sync-log.entity';
import { WireTransfer } from '../entities/wire-transfer.entity';
import { QuickBooksService } from './quickbooks.service';

@Injectable()
export class QuickBooksWebhookService {
  private readonly logger = new Logger(QuickBooksWebhookService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(SyncLog)
    private readonly syncLogRepo: Repository<SyncLog>,
    @InjectRepository(WireTransfer)
    private readonly wireTransferRepo: Repository<WireTransfer>,
    private readonly quickBooksService: QuickBooksService,
  ) {}

  async processWebhook(headers: any, payload: any) {
    const entity = payload?.eventNotifications?.[0]?.dataChangeEvent?.entities?.[0];
    const eventType = entity?.name || 'unknown';
    const invoiceId = entity?.id;
    const realmId = payload?.eventNotifications?.[0]?.realmId;

    if (!invoiceId || eventType !== 'Invoice') {
      this.logger.warn(`Unrecognized QuickBooks event or missing invoice ID. ${JSON.stringify(payload)}`);
      return;
    }

    const invoiceDetails = await this.quickBooksService.fetchInvoiceDetails(invoiceId);

    // if (!invoiceDetails || invoiceDetails?.Balance > 0) {
    //  this.logger.warn(`Invoice ${invoiceId} not marked as paid. Balance: ${invoiceDetails?.Balance}`); return;} 

 const invoice = invoiceDetails?.Invoice;

if (!invoice || invoice.Balance > 0 || invoice.TxnStatus !== 'Paid') {
  this.logger.warn(`Invoice ${invoiceId} not fully paid. Balance: ${invoice?.Balance}, Status: ${invoice?.TxnStatus}`);
  return;
}

    const internalInvoice = await this.invoiceRepo.findOne({ where: { qbInvoiceId: invoiceId } });

    await this.syncLogRepo.save({
      invoiceReference: invoiceId,
      verified: !!internalInvoice,
      verifiedAt: new Date(),
      rawResponse: payload,
      source: 'webhook',
    });

    if (!internalInvoice) {
      this.logger.warn(`No matching internal invoice found for QuickBooks invoice ${invoiceId}`);
      return;
    }

    internalInvoice.status = 'PAID';
    await this.invoiceRepo.save(internalInvoice);

    const wire = await this.wireTransferRepo.findOne({ where: { invoiceId: internalInvoice.id } });
    if (wire && wire.status === 'pending') {
      wire.status = 'confirmed';
      wire.confirmedBy = 'QuickBooks Webhook';
      wire.receivedAt = new Date();
      await this.wireTransferRepo.save(wire);
      this.logger.log(`Wire linked to invoice ${internalInvoice.id} confirmed`);
    }

    this.logger.log(`Invoice ${invoiceId} marked as PAID`);
  }
}
 */


/* // src/services/quickbooks-webhook.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { SyncLog } from '../entities/sync-log.entity';
import { WireTransfer } from '../entities/wire-transfer.entity';
//import { ProjectService } from './project.service';
//import { AirtableUpdateService } from './airtable-update.service';

@Injectable()
export class QuickBooksWebhookService {
  private readonly logger = new Logger(QuickBooksWebhookService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(SyncLog)
    private readonly syncLogRepo: Repository<SyncLog>,
    @InjectRepository(WireTransfer)
    private readonly wireTransferRepo: Repository<WireTransfer>,
    //private readonly projectService: ProjectService,
    //private readonly airtableUpdateService: AirtableUpdateService,
  ) {}

  async processWebhook(headers: any, payload: any) {
    const eventType = payload?.eventNotifications?.[0]?.dataChangeEvent?.entities?.[0]?.name || 'unknown';
    const invoiceId = payload?.eventNotifications?.[0]?.dataChangeEvent?.entities?.[0]?.id;
    const realmId = payload?.eventNotifications?.[0]?.realmId;

    if (!invoiceId || eventType !== 'Invoice') {
      this.logger.warn(`Unrecognized QuickBooks event or missing invoice ID. ${JSON.stringify(payload)}`);
      return;
    }

    //const qbDocNumber = `QBO-${invoiceId}`; // this was in some requirement doc to compare value liek QBO-invoiceID but in DB we are only storeing invoiceId not QBO so this was a conflict to compare value thats why removed this line
    const internalInvoice = await this.invoiceRepo.findOne({ where: { qbInvoiceId: invoiceId } });

    await this.syncLogRepo.save({
      invoiceReference: invoiceId,
      verified: !!internalInvoice,
      verifiedAt: new Date(),
      rawResponse: payload,
      source: 'webhook'
    });

    if (internalInvoice) {
   // if(invoiceId || internalInvoice) {
      this.logger.log(`Processing QuickBooks invoice ${invoiceId}`);
      internalInvoice.status = 'PAID';
      await this.invoiceRepo.save(internalInvoice);

      //  Link to wire transfer and confirm
      const wire = await this.wireTransferRepo.findOne({ where: { invoiceId: internalInvoice.id } });
      if (wire && wire.status === 'pending') {
        wire.status = 'confirmed';
        wire.confirmedBy = 'QuickBooks Webhook';
        wire.receivedAt = new Date();
        await this.wireTransferRepo.save(wire);
        this.logger.log(`Wire linked to invoice ${internalInvoice.id} confirmed`);

        //  Activate project if needed
       // await this.projectService.activateProjectByInvoiceId(internalInvoice.id);

        //  Sync Airtable status update
        //await this.airtableUpdateService.markVerified(wire.transactionId);
      }

      this.logger.log(`Invoice ${invoiceId} marked as PAID`);
    } else {
      this.logger.warn(`No matching internal invoice found for QuickBooks invoice ${invoiceId}`);
    }
  }
}
 */
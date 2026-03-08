# **📄 QuickBooks Invoice Sync Audit & Monitoring Guide**

### **🧭 Purpose**

This document provides implementation-level instructions for monitoring,
verifying, and debugging invoice synchronization between the Marketeq
platform and QuickBooks, specifically for wire transfer payments. It
includes all required code, folder structure, alerting logic, and
logging strategy. This document assumes that the core QuickBooks
integration is already complete and focuses exclusively on **audit, sync
verification, and error recovery**.

## **📁 Folder Structure**

All code below should be located inside the existing accounting-service
or quickbooks-service microservice.

app/

└── quickbooks-service/

├── controllers/

│ └── sync.controller.ts

├── services/

│ ├── quickbooks.service.ts

│ └── sync-monitor.service.ts

├── jobs/

│ └── invoice-sync.job.ts

├── utils/

│ └── slack-notify.ts

├── logs/

│ └── invoice-sync.log

└── dto/

└── invoice-status.dto.ts



## **🔄 Background Invoice Sync Job**

### **File: jobs/invoice-sync.job.ts**

****import { Injectable } from \'@nestjs/common\';

import { Cron } from \'@nestjs/schedule\';

import { SyncMonitorService } from \'../services/sync-monitor.service\';

\@Injectable()

export class InvoiceSyncJob {

constructor(private readonly syncMonitorService: SyncMonitorService) {}

// Runs every 30 minutes

\@Cron(\'\*/30 \* \* \* \*\')

async handleInvoiceSync() {

await this.syncMonitorService.verifyUnpaidQuickBooksInvoices();

}

}



## **🧠 Core Sync Monitoring Logic**

### **File: services/sync-monitor.service.ts**

****import { Injectable, Logger } from \'@nestjs/common\';

import { QuickBooksService } from \'./quickbooks.service\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { InvoiceEntity } from \'../entities/invoice.entity\';

import { Repository } from \'typeorm\';

import { notifySlack } from \'../utils/slack-notify\';

\@Injectable()

export class SyncMonitorService {

private readonly logger = new Logger(SyncMonitorService.name);

constructor(

private readonly quickBooksService: QuickBooksService,

\@InjectRepository(InvoiceEntity)

private readonly invoiceRepo: Repository\<InvoiceEntity\>

) {}

async verifyUnpaidQuickBooksInvoices(): Promise\<void\> {

const unsyncedInvoices = await this.invoiceRepo.find({

where: { paymentStatus: \'PENDING\', method: \'WIRE_TRANSFER\' }

});

for (const invoice of unsyncedInvoices) {

try {

const qbStatus = await
this.quickBooksService.getInvoiceStatus(invoice.qbInvoiceId);

if (qbStatus === \'PAID\') {

invoice.paymentStatus = \'PAID\';

invoice.syncedAt = new Date();

await this.invoiceRepo.save(invoice);

this.logger.log(\`Invoice \${invoice.id} marked as PAID via
QuickBooks.\`);

}

} catch (error) {

this.logger.error(\`Failed to sync invoice \${invoice.id}:
\${error.message}\`);

await notifySlack(\`⚠️ Invoice sync failed: ID \${invoice.id}, error:
\${error.message}\`);

}

}

}

}



## **🧾 DTO for Invoice Status**

### **File: dto/invoice-status.dto.ts**

****export class InvoiceStatusDTO {

invoiceId: string;

paymentStatus: \'PENDING\' \| \'PAID\' \| \'FAILED\';

syncedAt?: Date;

}



## **🔔 Slack Notification Utility**

### **File: utils/slack-notify.ts**

****import axios from \'axios\';

const SLACK_WEBHOOK_URL = process.env.SLACK_INVOICE_MONITOR_URL;

export async function notifySlack(message: string): Promise\<void\> {

if (!SLACK_WEBHOOK_URL) return;

try {

await axios.post(SLACK_WEBHOOK_URL, { text: message });

} catch (error) {

console.error(\'Failed to send Slack alert:\', error.message);

}

}



## **📊 Log File Output**

Log output is saved in a dedicated log file and streamed to your
platform log aggregator.

### **File: logs/invoice-sync.log (auto-generated)**

****\[2025-06-24 10:15:00\] Invoice 7fbf\... marked as PAID via
QuickBooks.

\[2025-06-24 10:45:00\] Invoice 38df\... sync failed: QuickBooks API
timeout.



## **📌 Summary of Logic**

  **Feature**                **Behavior**
  -------------------------- -----------------------------------------------------------------------
  Sync Frequency             Every 30 minutes via Cron job
  Sync Condition             Unpaid wire transfer invoices
  Invoice Source             QuickBooks wire payment confirmation
  Platform Behavior          Mark invoice as paid internally if QuickBooks marks as paid
  Error Recovery             Log error, alert Slack, retry on next sync window
  Alerting                   Slack webhook to accounts receivable channel
  Developer Access to Logs   Via app logs or centralized logging system like Datadog, Sentry, etc.

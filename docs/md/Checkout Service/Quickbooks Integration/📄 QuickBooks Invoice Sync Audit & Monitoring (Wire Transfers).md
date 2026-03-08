# **📄 QuickBooks Invoice Sync Audit & Monitoring (Wire Transfers)**

## **🧭 Purpose**

This document provides complete implementation instructions for auditing
and monitoring invoice synchronization between the Marketeq platform and
QuickBooks --- specifically for **wire transfers**. It ensures accurate
payment status, prevents manual tampering, and includes Slack alerting,
logging, and retry handling.

Invoices for **wire transfers are not created in Stripe**. These are
created directly by the platform and synced with QuickBooks. This
service verifies whether the wire payment was received by checking
QuickBooks and updating the platform invoice accordingly.

## **📁 Folder Structure**

Place the following code inside your quickbooks-service or
accounting-service.

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

├── dto/

│ └── invoice-status.dto.ts

└── entities/

└── invoice.entity.ts



## **🔄 Scheduled Sync Job**

### **jobs/invoice-sync.job.ts**

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

## **🧠 Invoice Sync Monitor Logic**

### **services/sync-monitor.service.ts**

****import { Injectable, Logger } from \'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

import { InvoiceEntity } from \'../entities/invoice.entity\';

import { QuickBooksService } from \'./quickbooks.service\';

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

const unsynced = await this.invoiceRepo.find({

where: { paymentStatus: \'PENDING\', method: \'WIRE_TRANSFER\' }

});

for (const invoice of unsynced) {

try {

const qbStatus = await
this.quickBooksService.getInvoiceStatus(invoice.qbInvoiceId);

if (qbStatus === \'PAID\') {

invoice.paymentStatus = \'PAID\';

invoice.syncedAt = new Date();

await this.invoiceRepo.save(invoice);

this.logger.log(\`✅ Invoice \${invoice.id} marked as PAID via
QuickBooks\`);

}

} catch (err) {

this.logger.error(\`❌ Failed syncing invoice \${invoice.id}:
\${err.message}\`);

await notifySlack(\`🚨 Invoice Sync Error: ID
\${invoice.id}\\n\${err.message}\`);

}

}

}

}



## **🔧 QuickBooks Invoice Status Method**

Add to your existing quickbooks.service.ts:

async getInvoiceStatus(invoiceId: string): Promise\<\'PAID\' \|
\'PENDING\' \| \'FAILED\'\> {

try {

const response = await
this.quickBooksClient.get(\`/v3/company/\${this.realmId}/invoice/\${invoiceId}\`);

const status = response?.Invoice?.Balance;

return status === 0 ? \'PAID\' : \'PENDING\';

} catch (error) {

throw new Error(\`QuickBooks API error for invoice \${invoiceId}:
\${error.message}\`);

}

}



## **🧾 DTO -- Invoice Sync Status**

### **dto/invoice-status.dto.ts**

****export class InvoiceStatusDTO {

invoiceId: string;

paymentStatus: \'PENDING\' \| \'PAID\' \| \'FAILED\';

syncedAt?: Date;

}



## **🧑‍💻 Entity (Partial) -- Invoice**

### **entities/invoice.entity.ts**

****\@Entity(\'invoices\')

export class InvoiceEntity {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

qbInvoiceId: string;

\@Column({ default: \'PENDING\' })

paymentStatus: \'PENDING\' \| \'PAID\' \| \'FAILED\';

\@Column({ nullable: true })

syncedAt: Date;

\@Column()

method: \'WIRE_TRANSFER\' \| \'CREDIT_CARD\' \| \'ACH\';

}



## **📣 Slack Alerts for Sync Failures**

### **utils/slack-notify.ts**

****import axios from \'axios\';

const SLACK_WEBHOOK_URL = process.env.SLACK_INVOICE_MONITOR_URL;

export async function notifySlack(message: string): Promise\<void\> {

if (!SLACK_WEBHOOK_URL) return;

try {

await axios.post(SLACK_WEBHOOK_URL, { text: message });

} catch (err) {

console.error(\'Slack notification failed:\', err.message);

}

}



## **📂 Log Output Example**

These logs are stored locally or piped to your observability tool (e.g.
Datadog):

\[2025-06-24 09:30:00\] ✅ Invoice 32a1\... marked as PAID via
QuickBooks

\[2025-06-24 10:00:00\] ❌ Invoice 9bdf\... sync failed: QuickBooks API
timeout



## **🔁 Retry & Recovery Strategy**

  **Scenario**                         **Action**
  ------------------------------------ ---------------------------------------------------------------------
  Invoice not yet paid in QuickBooks   Retry in 30 min (auto)
  Invoice API call fails               Notify Slack + retry silently
  Payment marked as paid               Save syncedAt, update DB and logs
  Repeated sync failure                Email accounts receivable + post to Slack channel
  Manual override required             Admin manually confirms payment inside QuickBooks if all else fails

## **✅ Summary**

- ✅ Background job runs every 30 minutes

- ✅ Only wire transfers are checked

- ✅ Platform does not rely on Stripe for wire transfers

- ✅ All paid invoices in QuickBooks are auto-marked paid in platform

- ✅ Slack alerts are sent on failure

- ✅ No manual confirmation needed unless QuickBooks API is unreachable

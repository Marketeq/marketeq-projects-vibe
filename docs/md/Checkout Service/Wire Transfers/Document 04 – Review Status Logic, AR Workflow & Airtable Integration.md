### **Document 04 -- Review Status Logic, AR Workflow & Airtable Integration**

#### **📁 Microservice: ar-verification-service**

### **📌 Overview**

This document defines the full review workflow for wire transfers,
including how manual approvals are handled via Airtable, status logic,
and secure verification updates back to the platform. It assumes:

- Mercury transactions are pulled into the system

- A match score is calculated

- All transactions are **sent to Airtable** for **manual verification\**

- Only QuickBooks status changes (marked as Paid) finalize verification

### **🔁 Manual Review Flow**

All incoming wire transfers, regardless of confidence score, are **sent
to Airtable** for **manual review**. Auto-verification is explicitly
disallowed.

### **🧠 Airtable Schema**

The following schema is used to populate the Wire Transfer Review base
in Airtable:

  ----------------------------------------------------------------------
  **Column Name**     **Description**
  ------------------- --------------------------------------------------
  Transaction ID      Unique ID from Mercury or QuickBooks

  Project/Contract ID Pulled from metadata or match logic

  Client Name         Name found in Mercury/QuickBooks

  Email on            Payer\'s email from transaction (may not match
  Transaction         platform user)

  Platform User Email If a user match is found; otherwise left blank

  Amount Received     Payment amount from transaction

  Expected Amount     Contract total or invoice total

  Match Score (%)     Score based on backend matching logic

  Status              Manual dropdown: Pending, Needs Review, Verified,
                      Rejected

  Reviewed By         Optional: name or email of AR team member

  QuickBooks Invoice  Used for backend sync + visibility
  ID                  

  Synced to Platform? Boolean or timestamp confirming sync to backend
  ----------------------------------------------------------------------

### **⚙️ Implementation**

#### **📁 Folder Structure**

****ar-verification-service/

├── src/

│ ├── airtable/

│ │ ├── airtable.service.ts

│ │ └── airtable.schema.ts

│ ├── match-score/

│ │ └── match-score.service.ts

│ ├── review-status/

│ │ ├── status-update.service.ts

│ │ └── constants.ts

│ ├── quickbooks/

│ │ └── quickbooks.listener.ts

│ ├── mercury/

│ │ └── mercury.listener.ts

│ └── main.ts

├── .env

└── package.json



### **🧩 Step 1: Push Transactions to Airtable**

**airtable.service.ts**

****import Airtable from \'airtable\';

import { Injectable } from \'@nestjs/common\';

\@Injectable()

export class AirtableService {

private base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })

.base(process.env.AIRTABLE_BASE_ID);

async pushWireTransfer(record: any) {

const mappedFields = {

\'Transaction ID\': record.transactionId,

\'Project/Contract ID\': record.contractId,

\'Client Name\': record.clientName,

\'Email on Transaction\': record.emailOnTxn,

\'Platform User Email\': record.userEmail,

\'Amount Received\': record.amountReceived,

\'Expected Amount\': record.expectedAmount,

\'Match Score (%)\': record.matchScore,

\'Status\': \'Pending\',

\'QuickBooks Invoice ID\': record.invoiceId,

\'Synced to Platform?\': false

};

return this.base(\'Wire Transfer Review\').create(\[{ fields:
mappedFields }\]);

}

}



### **🧩 Step 2: Match Score Logic**

Only the score is calculated --- no action is taken.

**match-score.service.ts**

****export function calculateMatchScore(record: {

projectIdMatch: boolean;

emailMatch: boolean;

clientNameMatch: boolean;

expectedAmount: number;

receivedAmount: number;

invoiceIdMatch: boolean;

}): number {

let score = 0;

if (record.projectIdMatch) score += 50;

if (record.emailMatch) score += 15;

if (record.clientNameMatch) score += 10;

if (record.invoiceIdMatch) score += 5;

const amountDiff = Math.abs(record.expectedAmount -
record.receivedAmount);

if (amountDiff \<= 1) score += 20;

return score;

}



### **🧩 Step 3: Final Verification via QuickBooks**

When a QuickBooks webhook (or polling logic) marks an invoice as
**Paid**, update the Airtable record status and backend platform.

**status-update.service.ts**

****\@Injectable()

export class StatusUpdateService {

constructor(private readonly airtable: AirtableService) {}

async markAsVerified(invoiceId: string) {

const record = await this.airtable.findByInvoiceId(invoiceId);

if (!record) return;

await this.airtable.updateStatus(record.id, {

Status: \'Verified\',

\'Reviewed By\': \'System -- QuickBooks Sync\',

\'Synced to Platform?\': new Date().toISOString(),

});

// Sync to backend (e.g., mark project as Paid)

await this.notifyBackend(record.fields\[\'Project/Contract ID\'\]);

}

private async notifyBackend(contractId: string) {

await
fetch(\`\${process.env.PLATFORM_URL}/api/contracts/\${contractId}/mark-paid\`,
{

method: \'POST\',

headers: { \'Authorization\': \`Bearer
\${process.env.INTERNAL_API_KEY}\` }

});

}

}



### **🛑 Security Reminder**

Airtable status changes **do not confirm payment**. The **only source of
truth is QuickBooks.**

Even if the AR team changes the status in Airtable to \"Verified\", no
update will be synced to the backend unless a matching **QuickBooks
invoice is marked as paid**.

### **✅ Summary of Flow**

1.  Mercury + QuickBooks data is pulled

2.  Match score is calculated and sent to Airtable

3.  AR team manually reviews in Airtable

4.  When QuickBooks marks invoice as **Paid**, backend verifies it

5.  Final status is synced to platform, confirming the payment

### **📄 Document 01 -- Wire Transfer Verification -- Full Backend Flow (Mercury + QuickBooks Sync + Status Update)**

### **✅ Purpose**

This document defines the full backend architecture and code for
securely verifying wire transfers via the Mercury API and QuickBooks,
matching them to the correct contract (project/service/team/individual),
and syncing their status back to the platform with full audit trail
support.

### **✅ Microservice Folder Structure**

****wire-transfer-verification-service/

├── src/

│ ├── main.ts

│ ├── app.module.ts

│ ├── mercury/

│ │ ├── mercury.module.ts

│ │ ├── mercury.service.ts

│ ├── quickbooks/

│ │ ├── quickbooks.module.ts

│ │ ├── quickbooks.service.ts

│ ├── matching/

│ │ ├── matcher.module.ts

│ │ ├── matcher.service.ts

│ ├── webhook/

│ │ ├── webhook.controller.ts

│ │ ├── webhook.module.ts

│ ├── notification/

│ │ ├── notification.service.ts

│ ├── types/

│ │ ├── transaction.types.ts

│ ├── config/

│ │ ├── env.config.ts

│ └── utils/

│ ├── scoring.util.ts

│ └── logger.ts

├── package.json

├── .env

└── README.md



### **✅ Mercury Wire Transaction Fetch**

#### **🔹 mercury.service.ts**

****\@Injectable()

export class MercuryService {

constructor(private readonly http: HttpService) {}

async fetchRecentTransactions(): Promise\<MercuryTransaction\[\]\> {

const res = await this.http

.get(\'https://api.mercury.com/v1/transactions\', {

headers: { Authorization: \`Bearer \${process.env.MERCURY_API_KEY}\` },

})

.toPromise();

return res.data.transactions.map(tx =\> ({

transactionId: tx.id,

amount: tx.amount,

memo: tx.memo,

date: tx.date,

raw: tx,

}));

}

}



### **✅ QuickBooks Invoice Sync & Check**

#### **🔹 quickbooks.service.ts**

****\@Injectable()

export class QuickBooksService {

constructor(private readonly http: HttpService) {}

async getInvoiceByProjectId(projectId: string):
Promise\<QuickBooksInvoice \| null\> {

const res = await this.http.get(

\`\${process.env.QBO_API_BASE}/invoices?projectId=\${projectId}\`,

{

headers: { Authorization: \`Bearer \${process.env.QBO_ACCESS_TOKEN}\` },

},

);

return res.data?.invoice \|\| null;

}

async isInvoiceMarkedPaid(invoiceId: string): Promise\<boolean\> {

const res = await this.http.get(

\`\${process.env.QBO_API_BASE}/invoice/\${invoiceId}\`,

{

headers: { Authorization: \`Bearer \${process.env.QBO_ACCESS_TOKEN}\` },

},

);

return res.data?.Balance === 0;

}

}



### **✅ Matching Score Logic**

#### **🔹 scoring.util.ts**

****export function calculateMatchScore({

projectIdFromMemo,

actualProjectId,

emailMatch,

amountMatch,

}: {

projectIdFromMemo: string;

actualProjectId: string;

emailMatch: boolean;

amountMatch: boolean;

}): number {

let score = 0;

if (projectIdFromMemo === actualProjectId) score += 60;

if (emailMatch) score += 20;

if (amountMatch) score += 20;

return score;

}



### **✅ Matching Workflow Logic**

#### **🔹 matcher.service.ts**

****\@Injectable()

export class MatcherService {

constructor(

private readonly mercury: MercuryService,

private readonly quickbooks: QuickBooksService,

private readonly notify: NotificationService,

) {}

async matchAndVerifyTransactions() {

const transactions = await this.mercury.fetchRecentTransactions();

for (const tx of transactions) {

const projectIdFromMemo = extractProjectId(tx.memo); // Implement regex

const invoice = await
this.quickbooks.getInvoiceByProjectId(projectIdFromMemo);

if (!invoice) continue;

const emailMatch = tx.raw.senderEmail === invoice.customer.email;

const amountMatch = tx.amount === invoice.totalAmount;

const matchScore = calculateMatchScore({

projectIdFromMemo,

actualProjectId: invoice.projectId,

emailMatch,

amountMatch,

});

const status = matchScore \>= 80 ? \'Verified\' : matchScore \>= 50 ?
\'Needs Review\' : \'Pending\';

await this.syncToPlatform({

transactionId: tx.transactionId,

projectId: invoice.projectId,

amount: tx.amount,

email: tx.raw.senderEmail,

matchScore,

status,

quickbooksInvoiceId: invoice.id,

});

if (status !== \'Verified\') {

await this.notify.sendUnmatchedAlert(tx, matchScore);

}

}

}

async syncToPlatform(data: any) {

await axios.post(\`\${process.env.PLATFORM_API}/sync-wire-status\`,
data);

}

}



### **✅ Error Handling & Notifications**

#### **🔹 notification.service.ts**

****\@Injectable()

export class NotificationService {

async sendUnmatchedAlert(tx: MercuryTransaction, score: number) {

await axios.post(process.env.SLACK_WEBHOOK_URL, {

text: \`⚠️ Wire Transfer Match Incomplete\\n\\nTransaction ID:
\${tx.transactionId}\\nAmount: \${tx.amount}\\nMatch Score:
\${score}%\`,

});

await sendEmail({

to: process.env.AR_TEAM_EMAIL,

subject: \`Wire Match Alert -- \${score}% confidence\`,

body: \`Transaction \${tx.transactionId} for \$\${tx.amount} had a low
match score.\\n\\nCheck it manually.\`,

});

}

}



### **✅ Final Status Update Summary**

When a match is confirmed (manually or automatically), the final payload
is synced back to the platform with this shape:

{

transactionId: \'txn_abc123\',

projectId: \'proj_xyz789\',

clientName: \'Acme Corp\',

email: \'payments@acme.com\',

platformUserEmail: \'client@marketeq.com\',

amountReceived: 5000,

expectedAmount: 5000,

matchScore: 100,

status: \'Verified\',

reviewedBy: null,

quickbooksInvoiceId: \'qbo_3321\',

syncedToPlatform: true

}



Let me know when you're ready to proceed with Document 02: Matching
Score Logic & Manual Review Criteria.

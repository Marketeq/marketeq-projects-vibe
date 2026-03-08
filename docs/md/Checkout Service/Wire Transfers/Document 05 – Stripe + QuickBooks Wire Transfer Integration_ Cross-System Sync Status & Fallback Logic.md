**Document 05 -- Stripe + QuickBooks Wire Transfer Integration:
Cross-System Sync Status & Fallback Logic**

### **🔐 Purpose**

This document outlines the complete backend integration logic for
syncing wire transfer invoices across both **Stripe** (for card/ACH) and
**QuickBooks** (for wire transfers), with cross-system verification
status and fallback mechanisms. It defines how to handle sync
discrepancies, recovery from failure, and how to maintain Stripe as the
source of truth for card-based payments while deferring to QuickBooks
for full-amount wire transfers.

## **🔄 Core Sync Logic**

### **Stripe as Source of Truth (Card / ACH)**

- Stripe invoices are generated at checkout for **card, ACH, or bank
  payments**.

- These invoices use Stripe\'s native invoice and subscription APIs.

- No integration to QuickBooks is required for these.

### **QuickBooks as Source of Truth (Wire Transfers)**

- For **wire transfer payments**, invoices are generated **only in
  QuickBooks**.

- These invoices are linked to the internal project/contract ID using
  the DocNumber field.

- Stripe is **not** used for these wire payments --- no subscription, no
  hosted page.

## **🧠 Integration Behavior: Sync Strategy**

### **✅ On Checkout (Wire Transfer Flow Only)**

1.  A project/contract is submitted with payment type = wire_transfer.

2.  Backend invokes:

await quickbooksService.createInvoice({

docNumber: \'INV-2025-00035\', // from Marketeq

customerId: quickbooksCustomerId,

lineItems: \[{

description: \'Project: UX Redesign for Tesla\',

amount: 15000,

}\],

metadata: {

contractId: \'ctr_23a42j123\',

clientEmail: \'client@tesla.com\',

}

});

3.  \
    The invoice is **unpaid** at this stage and visible in QuickBooks.

## **🔁 Sync Status Flow: Paid Invoice in QuickBooks → Platform Update**

When a wire transfer is confirmed **manually** by the AR team in
QuickBooks (status = Paid):

1.  **Backend Sync Job** runs (real-time webhook or fallback cron every
    30 min).

2.  Invoice is fetched from QuickBooks:

const invoice = await
quickbooksService.getInvoiceByDocNumber(\'INV-2025-00035\');

if (invoice.Balance === 0 && invoice.PrivateNote === \'Wire confirmed\')
{

// Mark as paid in Marketeq system

}

3.  \
    Backend updates the internal record in the billing-service:

await billingService.markInvoiceAsPaid({

invoiceId: \'INV-2025-00035\',

method: \'wire_transfer\',

syncedFrom: \'quickbooks\',

});



## **🚨 Fallback Logic & Recovery**

### **🔁 Retry Logic (If QuickBooks Fails)**

If the QuickBooks API fails to respond:

- Retry 3x with exponential backoff (e.g., 1 min, 5 min, 15 min).

- If all retries fail:

  - Log to error monitoring service (e.g., Sentry).

  - Notify AR team via email:

await emailService.send({

to: \'ar@marketeq.io\',

subject: \'QuickBooks Sync Failure\',

body: \`Failed to sync invoice INV-2025-00035 to QuickBooks. Please
check manually.\`

});

- \
  Cron job runs every 30 minutes to retry failures silently.

## **🧪 Cross-System Sync Validation (Stripe vs QuickBooks)**

Although wire transfers don\'t go through Stripe, edge cases must be
handled:

- If **a Stripe invoice was mistakenly created** for a wire transfer,
  flag it.

- If **QuickBooks invoice is missing for a contract marked as wire
  transfer**, flag it.

Validation logic in monitoring script:

if (contract.paymentMethod === \'wire_transfer\') {

const hasStripeInvoice = await
stripeService.findInvoiceByContract(contract.id);

if (hasStripeInvoice) {

logger.warn(\`Unexpected Stripe invoice for wire transfer:
\${contract.id}\`);

}

const hasQBInvoice = await
quickbooksService.findInvoiceByContract(contract.id);

if (!hasQBInvoice) {

logger.error(\`Missing QuickBooks invoice for wire transfer:
\${contract.id}\`);

}

}



## **📦 Folder Structure**

****billing-service/

│

├── src/

│ ├── quickbooks/

│ │ ├── quickbooks.service.ts \# Invoice creation, fetching, sync status

│ │ └── quickbooks.types.ts

│ ├── stripe/

│ │ ├── stripe.service.ts \# Stripe subscription & invoice logic

│ ├── sync/

│ │ └── invoice-sync.service.ts \# Orchestrates sync from QuickBooks to
Platform

│ └── utils/

│ └── retry.utils.ts \# Retry with exponential backoff

│

├── jobs/

│ └── cron-sync-invoices.ts \# Fallback cron job for retry logic

│

└── logs/

└── sync-errors.log



## **✅ Summary**

- **Stripe** handles card/ACH payments and is the invoice source of
  truth in those cases.

- **QuickBooks** handles all wire transfers and is the source of truth
  for wire invoices.

- All wire payments are manually confirmed in QuickBooks.

- Sync to the platform is handled via **webhooks** (preferred) or **cron
  fallback**.

- **Invoice ID consistency** is maintained by passing the Marketeq
  invoice ID as DocNumber to QuickBooks.

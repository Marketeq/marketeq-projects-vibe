# **📄 23 -- QuickBooks Wire Transfer Verification Integration**

## **🧭 Purpose**

This document provides a complete, production-ready implementation for
integrating **QuickBooks wire transfer verification** into the Marketeq
Checkout system. The logic ensures that platform-generated invoices are
marked as paid only after QuickBooks confirms wire transfer receipt,
**without manual override** by internal developers or accounts
receivable agents.

This document assumes:

- The invoice is generated on the Marketeq platform.

- QuickBooks is the source of truth for payment confirmation.

- Wire transfer detection is based on invoice numbers and client
  identifiers.

## **📁 Folder Structure**

****app/

└── billing-service/

├── src/

│ ├── quickbooks/

│ │ ├── quickbooks.module.ts

│ │ ├── quickbooks.service.ts

│ │ ├── quickbooks.controller.ts

│ │ └── dtos/

│ │ └── verify-invoice.dto.ts

│ └── jobs/

│ └── verify-wire-transfer.job.ts

└── prisma/

└── schema.prisma

## **🔐 Environment Variables**

****QUICKBOOKS_CLIENT_ID=your_client_id

QUICKBOOKS_CLIENT_SECRET=your_secret

QUICKBOOKS_REDIRECT_URI=https://api.marketeq.com/callback

QUICKBOOKS_REALM_ID=your_realm_id

QUICKBOOKS_REFRESH_TOKEN=your_refresh_token

## **🔌 Integration Logic**

### **✅ Step 1 -- Wire Transfer Invoice Creation (Platform)**

****// Inside checkout.service.ts

await this.invoiceService.createInvoice({

amount: 8000,

clientId: user.id,

method: \'WIRE\',

status: \'PENDING_WIRE\',

quickbooksReferenceId: \'INV-2025-0329-A1\',

});

### **✅ Step 2 -- QuickBooks Sync Job**

****// verify-wire-transfer.job.ts

const invoices = await quickbooksService.fetchInvoices();

for (const invoice of invoices) {

const match = await db.invoice.findFirst({

where: {

quickbooksReferenceId: invoice.DocNumber,

status: \'PENDING_WIRE\'

}

});

if (match && invoice.Balance === 0) {

await db.invoice.update({

where: { id: match.id },

data: { status: \'PAID\' }

});

await db.project.update({

where: { invoiceId: match.id },

data: { status: \'ACTIVE\' }

});

await notificationService.send(\'WIRE_CONFIRMED\', match.clientId);

}

}

### **✅ Step 3 -- QuickBooks OAuth & API (Service Layer)**

****// quickbooks.service.ts

async fetchInvoices() {

const token = await this.getAccessToken(); // from refresh_token

const response = await this.httpService.get(

\`https://quickbooks.api.intuit.com/v3/company/\${this.realmId}/query\`,

{

headers: { Authorization: \`Bearer \${token}\` },

params: { query: \'SELECT \* FROM Invoice WHERE Balance = 0\' },

}

);

return response.data.QueryResponse.Invoice \|\| \[\];

}



## **📌 Logging Table (Optional)**

  -----------------------------------------------------
  **Field**          **Type**      **Notes**
  ------------------ ------------- --------------------
  id                 UUID          

  invoiceReference   String        Platform invoice
                                   reference

  verified           Boolean       Whether payment was
                                   confirmed

  verifiedAt         DateTime      Timestamp of
                                   verification attempt

  rawResponse        JSON          Full API response
                                   from QuickBooks
  -----------------------------------------------------

## **🔒 Additional Security Measures**

- ❌ No ability to mark payment complete through Postgres or admin
  portal

- ✅ Only server-to-server confirmation from QuickBooks API allowed

- ✅ Stripe and wallet credits not affected by this job

- ✅ All verification attempts must be logged with audit trail

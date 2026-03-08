# **✅ Document 07 -- QuickBooks Invoice ID Sync Rules**

This document outlines how Marketeq assigns and syncs custom invoice IDs
(DocNumber) to QuickBooks invoices, ensuring alignment between Stripe
and QuickBooks. This prevents duplicate entries, improves audit trails,
and enhances confidence scoring for wire transfer verification.

## **🔧 Purpose**

Marketeq generates its own invoice IDs during Checkout. These IDs must
be:

- **Used as the DocNumber when creating QuickBooks invoices\**

- **Re-used by Stripe if Stripe is involved in invoice generation\**

- **Matched by downstream systems (AR dashboard, Airtable, etc.)\**

This allows consistent cross-platform referencing and supports match
scoring logic (see Document 02).

## **✅ Workflow Overview**

### **1. Invoice ID Generation in Marketeq**

During checkout (for both Stripe and non-Stripe payments), a custom
invoice ID is created using the following format:

// src/utils/invoice.util.ts

export const generateInvoiceId = (contractId: string): string =\> {

const timestamp = Date.now();

return \`INV-\${contractId.slice(0, 6).toUpperCase()}-\${timestamp}\`;

};

This ID is stored in the database and passed to downstream services
(QuickBooks, Airtable, AR logs).

### **2. Passing Invoice ID to QuickBooks as DocNumber**

When syncing to QuickBooks, this invoice ID is explicitly passed in the
DocNumber field:

// quickbooks.service.ts

const createQuickBooksInvoice = async (invoiceData: InvoicePayload) =\>
{

const invoicePayload = {

CustomerRef: { value: invoiceData.quickbooksCustomerId },

Line: \[\...buildInvoiceLines(invoiceData)\],

TxnDate: new Date().toISOString().split(\'T\')\[0\],

DueDate: new Date().toISOString().split(\'T\')\[0\],

DocNumber: invoiceData.invoiceId, // ← Marketeq-generated invoice ID

};

try {

const response = await quickbooksClient.createInvoice(invoicePayload);

return response.Invoice;

} catch (err) {

logger.error(\'Failed to create invoice in QuickBooks\', err);

throw new Error(\'QuickBooks invoice sync failed\');

}

};

The backend must **never allow QuickBooks to auto-generate a
DocNumber**.

### **3. Stripe Compatibility**

If the invoice is created in Stripe, this custom ID should be stored in
Stripe metadata or used as part of the internal invoice reference:

// stripe.service.ts

await stripe.invoices.update(stripeInvoiceId, {

metadata: {

marketeq_invoice_id: generatedInvoiceId,

projectId: project.id,

},

});



### **4. Why This Matters (Match Scoring & Auditing)**

When verifying a wire transfer:

- If the **QuickBooks invoice includes a DocNumber that matches** the
  platform's generated invoice ID, it adds a **+5% confidence score** in
  Document 02\'s match logic.

- This ensures you're reconciling against the correct invoice---even if
  the client or email mismatches.

## **🧪 Edge Cases**

### **🟨 1. Missing DocNumber in QuickBooks**

If QuickBooks auto-generates the ID because the platform failed to pass
a DocNumber, the invoice will still be valid but **will not contribute
to match score confidence**.

- The AR team must manually review and assign the correct invoice ID in
  Airtable.

- Logs should flag invoices missing DocNumber.

### **🟥 2. Duplicate Invoice ID (QuickBooks Conflict)**

If the DocNumber already exists in QuickBooks:

- QuickBooks will **reject the invoice creation** with a 400 error.

- The app should **retry with a new suffix** (e.g., add -1, -2) or flag
  it for manual admin resolution.

if (err.code === \'DuplicateDocNumber\') {

const fallbackId = \`\${invoiceId}-1\`;

// Retry logic with fallbackId\...

}



## **🧰 Folder Structure & Integration Points**

****backend/

│

├── src/

│ ├── quickbooks/

│ │ ├── quickbooks.service.ts \# Includes createInvoice() with DocNumber
logic

│ │ └── quickbooks.module.ts

│ ├── stripe/

│ │ └── stripe.service.ts \# Optionally syncs marketeq_invoice_id to
metadata

│ ├── utils/

│ │ └── invoice.util.ts \# generateInvoiceId()

│ └── billing/

│ └── invoice.controller.ts \# Endpoint for invoice creation



## **✅ Final Implementation Checklist**

- Always use generateInvoiceId() during checkout

- Sync DocNumber to QuickBooks via API

- Match this ID in AR logs and Airtable schema

- Add fallback handling for duplicate invoice IDs

- Do not use auto-generated QuickBooks IDs

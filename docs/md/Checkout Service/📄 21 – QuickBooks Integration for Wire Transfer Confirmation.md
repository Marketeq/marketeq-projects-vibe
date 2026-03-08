**📄 21 -- QuickBooks Integration for Wire Transfer Confirmation**

### **🧭 Purpose**

This document outlines the direct **API-based integration** between the
Marketeq checkout-service and **QuickBooks Online (QBO)**, with a
specific focus on **wire transfer confirmation** and syncing invoice
status.

Wire transfer payments are not processed through Stripe, so confirmation
must be automated through QuickBooks, where the accounts receivable team
marks invoices as paid. The system will programmatically monitor and
sync invoice status to determine when a wire transfer has been completed
and confirmed.

### **🔗 QuickBooks API Reference (QBO)**

- **Authentication:** OAuth 2.0 (via Intuit developer portal)

- **Base API URL:\**
  https://quickbooks.api.intuit.com/v3/company/{companyId}/

- **Resource Reference:** [[QuickBooks API Docs --
  Invoices\]{.underline}
  ](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used/invoice)

### **✅ Integration Workflow**

1.  **Create Invoice in Marketeq Platform\**

    - A wire transfer invoice is created internally when the user
      selects wire transfer at checkout.

    - Internal status is set to pending_wire.

2.  **Create or Link Invoice in QuickBooks\**

    - The system creates a matching invoice in QuickBooks using the
      Invoice API.

    - Save qb_invoice_id to the internal wire_transfers record.

3.  **Polling or Webhook for Invoice Updates\**

    - Poll QuickBooks every X minutes OR use CDC (Change Data Capture)
      webhook to track status updates.

    - When invoice is marked \"PaymentStatus\": \"Paid\" in QBO, it
      triggers the internal confirmation flow.

4.  **Update Internal Wire Transfer Record\**

    - Update status from pending → confirmed

    - Record confirmed_by = QuickBooks Sync and received_at = timestamp

5.  **Trigger Downstream Effects\**

    - Contract or project is marked as **Active\**

    - Payment Verified badge is assigned

    - Notifications dispatched

### **🛠️ API Setup -- Developer Instructions**

#### **Step 1: OAuth Setup**

- Register Marketeq on [[Intuit Developer\]{.underline}
  ](https://developer.intuit.com/)

- Configure OAuth redirect URI:
  https://api.marketeq.io/auth/quickbooks/callback

- Store and encrypt:

  - client_id

  - client_secret

  - refresh_token

#### **Step 2: Auth Token Rotation**

- Setup a background task to refresh tokens every 55 mins using the
  Refresh Token flow

- API: POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer

Authorization: Basic base64(client_id:client_secret)

Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token=YOUR_REFRESH_TOKEN

#### **Step 3: Create QuickBooks Invoice**

****POST /v3/company/{companyId}/invoice

{

\"Line\": \[

{

\"Amount\": 3000.00,

\"DetailType\": \"SalesItemLineDetail\",

\"SalesItemLineDetail\": {

\"ItemRef\": {

\"value\": \"1\",

\"name\": \"Consulting Project\"

}

}

}

\],

\"CustomerRef\": {

\"value\": \"{quickbooks_customer_id}\"

},

\"BillEmail\": {

\"Address\": \"client@email.com\"

},

\"CustomField\": \[

{ \"DefinitionId\": \"1\", \"StringValue\": \"InternalInvoiceId\",
\"Name\": \"MarketeqRef\" }

\]

}

> Save returned Invoice.Id to qb_invoice_id in the wire_transfers
> table.

#### **Step 4: Sync Status**

****GET /v3/company/{companyId}/invoice/{qb_invoice_id}

{

\"Invoice\": {

\"Id\": \"123\",

\"Balance\": 0,

\"TxnDate\": \"2025-06-12\",

\"PrivateNote\": \"Paid via wire\",

\"MetaData\": {

\"LastUpdatedTime\": \"2025-06-12T18:22:01-08:00\"

}

}

}

If Balance == 0, mark as **Paid**.

### **🧾 Internal Update Logic (Wire Transfer Sync)**

****if (invoice.Balance === 0) {

await db.wireTransfers.update({

where: { qb_invoice_id: invoice.Id },

data: {

status: \'confirmed\',

received_at: new Date(),

confirmed_by: \'QuickBooks Sync\'

}

});

await projectService.activateProject(invoice.projectId);

await badgeService.assignPaymentVerifiedBadge(invoice.clientId);

await notificationService.send(\'wire_payment_confirmed\',
invoice.clientId);

}



### **🔐 Security & Audit**

- All QBO API credentials must be stored encrypted

- Token refresh must be secure and auditable

- Each confirmed payment should be logged in payment_logs

- Use a system-level account for API calls (not per-user)

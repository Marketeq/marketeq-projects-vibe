# **📄 QuickBooks Integration for Wire Transfers**

## **✨ Purpose**

This document outlines the complete backend integration logic for wire
transfer invoice creation and payment confirmation using the QuickBooks
API. Wire transfers are received directly through the Mercury bank
account and not Stripe. Invoices for wire transfers will be generated in
QuickBooks and reconciled through backend logic, with manual
confirmation handled by the Accounts Receivable team.

## **🏦 Invoice Generation Rules**

- **Trigger**: Wire transfer invoice is created during **checkout**.

- **Status**: Initially marked as **unpaid**.

- **Usage**: Invoice is synced directly to QuickBooks for financial
  reporting and internal tracking.

- **No Stripe invoice is created** for wire transfer transactions.

## **🗓️ Invoice Payload Details (QuickBooks)**

The following details must be sent when creating the invoice:

interface QuickBooksWireInvoicePayload {

contractId: string;

projectId?: string; // optional if hiring individual or team directly

clientId: string;

clientName: string;

projectName: string;

amount: number; // total project or contract amount

dueDate: string; // ISO string, due immediately

description?: string;

}



## **💾 Folder Structure**

****app/

quickbooks-service/

src/

controllers/

invoice.controller.ts

services/

quickbooks.service.ts

wire-confirmation.service.ts

utils/

quickbooks-client.ts

dtos/

wire-invoice.dto.ts

main.ts



## **🔧 Invoice Creation Logic**

### **✏️ invoice.controller.ts**

****\@Post(\'create-wire-invoice\')

\@UseGuards(AuthGuard)

async createWireInvoice(@Body() dto: WireInvoiceDto) {

return this.quickbooksService.createWireInvoice(dto);

}

### **💡 quickbooks.service.ts**

****\@Injectable()

export class QuickBooksService {

constructor(private readonly client: QuickBooksClient) {}

async createWireInvoice(dto: WireInvoiceDto): Promise\<any\> {

const invoicePayload = this.buildInvoicePayload(dto);

try {

const res = await this.client.createInvoice(invoicePayload);

return res;

} catch (err) {

await this.logFailure(dto, err);

await this.notifyAccountsReceivable(dto, err);

throw new InternalServerErrorException(\'QuickBooks invoice creation
failed.\');

}

}

private buildInvoicePayload(dto: WireInvoiceDto):
QuickBooksWireInvoicePayload {

return {

contractId: dto.contractId,

projectId: dto.projectId,

clientId: dto.clientId,

clientName: dto.clientName,

projectName: dto.projectName,

amount: dto.amount,

dueDate: new Date().toISOString(),

};

}

private async logFailure(dto: WireInvoiceDto, err: any) {

console.error(\'QuickBooks Error:\', err);

// Optionally persist to DB

}

private async notifyAccountsReceivable(dto: WireInvoiceDto, err: any) {

// Optionally notify via email or Slack webhook

}

}



## **🔄 Invoice Confirmation (Manual Sync)**

The system will check QuickBooks for a matching paid invoice:

### **💡 wire-confirmation.service.ts**

****\@Injectable()

export class WireConfirmationService {

constructor(private readonly client: QuickBooksClient) {}

async verifyWireReceived(contractId: string): Promise\<boolean\> {

const invoice = await this.client.getInvoiceByContractId(contractId);

return invoice?.status === \'Paid\';

}

}



## **⚠️ Error Handling & Fallbacks**

- **Retries**: Invoice creation is retried **3 times** if the QuickBooks
  API fails.

- **Alerts**: AR team is notified via email or Slack if all retries
  fail.

- **Fallback**: Admin can manually re-sync invoice from dashboard or
  backend tool.

## **❌ Security Protections**

- Only backend service may confirm wire receipt.

- No admin interface for editing wire transfer status directly.

- Confirmations are based strictly on QuickBooks status.

- All access is logged and rate-limited.

## **🔎 Summary**

  **Action**                     **Trigger**                                **System**
  ------------------------------ ------------------------------------------ --------------------
  Invoice Generation             At checkout                                Platform + QBO API
  Invoice Payment Confirmation   AR sees paid status in QuickBooks          Manual check
  Platform Confirmation          Polling or webhook check confirms "Paid"   Platform logic

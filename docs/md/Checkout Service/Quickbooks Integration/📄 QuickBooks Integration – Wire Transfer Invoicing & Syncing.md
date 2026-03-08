# **📄 QuickBooks Integration -- Wire Transfer Invoicing & Syncing**

### **🧭 Purpose**

This document provides implementation-level instructions for integrating
wire transfer invoices into QuickBooks using the QuickBooks API. It
assumes Stripe is **not** used for wire transfer payments. All wire
payments are manually verified via QuickBooks and Mercury Bank and
synced to platform logic.

## **📁 Folder Structure**

****app/

├── quickbooks-service/

│ ├── controllers/

│ │ └── quickbooks.controller.ts

│ ├── services/

│ │ └── quickbooks.service.ts

│ ├── dtos/

│ │ └── create-invoice.dto.ts

│ ├── utils/

│ │ └── quickbooks-client.ts

│ └── quickbooks.module.ts



## **📦 1. DTO -- create-invoice.dto.ts**

****export class CreateInvoiceDto {

contractId: string;

contractType: \'project\' \| \'service\' \| \'team\' \| \'individual\';

projectName: string;

clientId: string;

clientName: string;

dueDate: string; // ISO string, set to today

amount: number;

}



## **🔌 2. QuickBooks Client -- quickbooks-client.ts**

Handles access token refresh and API requests.

import axios from \'axios\';

export class QuickBooksClient {

private baseUrl = \'https://quickbooks.api.intuit.com/v3/company\';

constructor(

private realmId: string,

private accessToken: string,

) {}

async createInvoice(invoicePayload: any) {

const url =
\`\${this.baseUrl}/\${this.realmId}/invoice?minorversion=65\`;

try {

const response = await axios.post(url, invoicePayload, {

headers: {

Authorization: \`Bearer \${this.accessToken}\`,

\'Content-Type\': \'application/json\'

},

});

return response.data;

} catch (err) {

throw new Error(\`QuickBooks API Error:
\${err.response?.data?.Fault?.Error\[0\]?.Message}\`);

}

}

}



## **⚙️ 3. QuickBooks Service -- quickbooks.service.ts**

****import { Injectable } from \'@nestjs/common\';

import { CreateInvoiceDto } from \'../dtos/create-invoice.dto\';

import { QuickBooksClient } from \'../utils/quickbooks-client\';

\@Injectable()

export class QuickBooksService {

async generateWireInvoice(dto: CreateInvoiceDto) {

const accessToken = await this.refreshToken();

const client = new QuickBooksClient(process.env.QUICKBOOKS_REALM_ID,
accessToken);

const invoicePayload = {

CustomerRef: { value: dto.clientId },

Line: \[{

Amount: dto.amount,

DetailType: \'SalesItemLineDetail\',

SalesItemLineDetail: {

ItemRef: { value: \'1\', name: dto.projectName }

}

}\],

TxnDate: new Date().toISOString().split(\'T\')\[0\],

DueDate: dto.dueDate,

PrivateNote: \`Contract ID: \${dto.contractId}\`

};

try {

const invoice = await client.createInvoice(invoicePayload);

return { success: true, invoiceId: invoice.Invoice.Id };

} catch (error) {

// Log, notify AR team, and continue

await this.notifyARTeam(dto, error.message);

return { success: false, error: error.message };

}

}

private async refreshToken(): Promise\<string\> {

// Real token refresh logic using OAuth2 --- out of scope here.

return \'mocked_access_token\';

}

private async notifyARTeam(dto: CreateInvoiceDto, message: string) {

// Send email or Slack notification to accounts receivable team

console.error(\`\[QuickBooks Sync Failed\] \${dto.contractId}:
\${message}\`);

}

}



## **📥 4. Controller -- quickbooks.controller.ts**

****import { Controller, Post, Body } from \'@nestjs/common\';

import { QuickBooksService } from \'../services/quickbooks.service\';

import { CreateInvoiceDto } from \'../dtos/create-invoice.dto\';

\@Controller(\'quickbooks\')

export class QuickBooksController {

constructor(private readonly qbService: QuickBooksService) {}

\@Post(\'/invoice/wire\')

async createWireInvoice(@Body() dto: CreateInvoiceDto) {

return this.qbService.generateWireInvoice(dto);

}

}



## **🧠 5. Sync Behavior + Fallback Logic**

  **Scenario**                   **Action**
  ------------------------------ -------------------------------------------------------------------------------------------------
  QuickBooks API returns error   Retry (up to 3 times, exponential backoff), notify AR team via Slack/email, and log to database
  Admin sees invoice missing     Manual sync tool (future), fallback on internal records
  Platform logic continues       Yes. Don't block the checkout or admin review flow
  Stripe invoice required?       No. Not for wire transfers. Stripe is skipped entirely

## **🔐 Security Notes**

- Use access token refresh logic with OAuth2 to keep access secure.

- Restrict QuickBooks sync controller to internal backend users or
  system processes only.

- DO NOT expose invoice sync or wire payment logic to external-facing
  endpoints.

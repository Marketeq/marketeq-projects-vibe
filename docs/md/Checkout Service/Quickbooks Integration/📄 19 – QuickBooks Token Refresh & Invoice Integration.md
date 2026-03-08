# **📄 19 -- QuickBooks Token Refresh & Invoice Integration**

This document provides full backend implementation instructions for
integrating QuickBooks with token refreshing and invoice syncing using
NestJS.

## **📁 Folder Structure**

****apps/

└── checkout-service/

├── src/

│ ├── services/

│ │ ├── quickbooks.service.ts

│ │ ├── token-refresh.service.ts

│ │ └── wire-transfer.service.ts

│ ├── modules/

│ │ └── quickbooks.module.ts

│ ├── controllers/

│ │ └── wire-transfer.controller.ts

│ ├── entities/

│ │ └── invoice.entity.ts

│ └── main.ts

└── .env



## **🧾 1. Environment Variables**

**File:** .env

QUICKBOOKS_CLIENT_ID=your-client-id

QUICKBOOKS_CLIENT_SECRET=your-client-secret

QUICKBOOKS_REFRESH_TOKEN=your-refresh-token

QUICKBOOKS_REALM_ID=your-realm-id

QUICKBOOKS_REDIRECT_URI=http://localhost:3003/callback



## **🔐 2. Token Refresh Utility**

**File:** token-refresh.service.ts

import { Injectable, Logger } from \'@nestjs/common\';

import axios from \'axios\';

\@Injectable()

export class TokenRefreshService {

private readonly logger = new Logger(TokenRefreshService.name);

async refreshAccessToken(refreshToken: string) {

try {

const params = new URLSearchParams();

params.append(\'grant_type\', \'refresh_token\');

params.append(\'refresh_token\', refreshToken);

const response = await
axios.post(\'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer\',
params, {

auth: {

username: process.env.QUICKBOOKS_CLIENT_ID,

password: process.env.QUICKBOOKS_CLIENT_SECRET,

},

headers: {

\'Content-Type\': \'application/x-www-form-urlencoded\',

},

});

return response.data.access_token;

} catch (error) {

this.logger.error(\'Failed to refresh QuickBooks access token\', error);

throw error;

}

}

}



## **🧾 3. QuickBooks Invoice Service**

**File:** quickbooks.service.ts

import { Injectable, Logger } from \'@nestjs/common\';

import { TokenRefreshService } from \'./token-refresh.service\';

import axios from \'axios\';

\@Injectable()

export class QuickBooksService {

private readonly logger = new Logger(QuickBooksService.name);

constructor(private readonly tokenRefreshService: TokenRefreshService)
{}

async createInvoice(invoiceData: any) {

const accessToken = await this.tokenRefreshService.refreshAccessToken(

process.env.QUICKBOOKS_REFRESH_TOKEN

);

const realmId = process.env.QUICKBOOKS_REALM_ID;

try {

const res = await axios.post(

\`https://sandbox-quickbooks.api.intuit.com/v3/company/\${realmId}/invoice?minorversion=65\`,

invoiceData,

{

headers: {

Authorization: \`Bearer \${accessToken}\`,

\'Content-Type\': \'application/json\',

Accept: \'application/json\',

},

}

);

this.logger.log(\`QuickBooks invoice created:
\${res.data.Invoice?.Id}\`);

return res.data;

} catch (err) {

this.logger.error(\'QuickBooks invoice creation failed\',
err.response?.data \|\| err.message);

throw err;

}

}

}



## **🔗 4. Wire Transfer Handler Service**

**File:** wire-transfer.service.ts

import { Injectable } from \'@nestjs/common\';

import { QuickBooksService } from \'./quickbooks.service\';

\@Injectable()

export class WireTransferService {

constructor(private readonly quickBooksService: QuickBooksService) {}

async initiateWireTransfer(invoicePayload: any) {

// Sync invoice with QuickBooks

const result = await
this.quickBooksService.createInvoice(invoicePayload);

// Additional business logic (store locally, confirm, etc.)

return {

status: \'success\',

quickBooksInvoiceId: result?.Invoice?.Id \|\| null,

};

}

}



## **🧩 5. Module Setup**

**File:** quickbooks.module.ts

import { Module } from \'@nestjs/common\';

import { TokenRefreshService } from
\'../services/token-refresh.service\';

import { QuickBooksService } from \'../services/quickbooks.service\';

import { WireTransferService } from
\'../services/wire-transfer.service\';

\@Module({

providers: \[TokenRefreshService, QuickBooksService,
WireTransferService\],

exports: \[TokenRefreshService, QuickBooksService,
WireTransferService\],

})

export class QuickBooksModule {}



## **✅ 6. Controller Example (Optional Wire Route)**

**File:** wire-transfer.controller.ts

import { Controller, Post, Body } from \'@nestjs/common\';

import { WireTransferService } from
\'../services/wire-transfer.service\';

\@Controller(\'checkout\')

export class WireTransferController {

constructor(private readonly wireTransferService: WireTransferService)
{}

\@Post(\'/confirm-wire\')

async confirmWire(@Body() body: any) {

return this.wireTransferService.initiateWireTransfer(body);

}

}



## **🧪 7. Testing Tips**

- Make sure .env values are set correctly.

- If you\'re getting 403, regenerate refresh token from your Intuit App
  settings.

- Use Postman to simulate payloads before frontend is ready.

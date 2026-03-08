# **📄 04 -- Backend Integration: Create Link Token + Exchange Token**

### **📌 Purpose**

This document provides the exact implementation of backend logic for:

- Generating a **Plaid Link Token\**

- Exchanging a **public_token** for a permanent **access_token\**

This is required to tokenize bank accounts for ACH payments.

### **📁 Folder & File Structure**

****app/

└── plaid-service/

├── src/

│ ├── plaid/

│ │ ├── plaid.controller.ts

│ │ ├── plaid.service.ts

│ │ └── plaid.module.ts

│ └── main.ts

└── .env



### **📦 Dependencies**

Install Plaid\'s Node.js SDK:

npm install plaid



### **🔐 .env Configuration**

****PLAID_CLIENT_ID=your_client_id

PLAID_SECRET=your_secret

PLAID_ENV=sandbox

PLAID_REDIRECT_URI=



### **🧩 plaid.module.ts**

****// plaid.module.ts

import { Module } from \'@nestjs/common\';

import { PlaidController } from \'./plaid.controller\';

import { PlaidService } from \'./plaid.service\';

\@Module({

controllers: \[PlaidController\],

providers: \[PlaidService\],

})

export class PlaidModule {}



### **🧠 plaid.service.ts**

****// plaid.service.ts

import { Injectable } from \'@nestjs/common\';

import { Configuration, PlaidApi, PlaidEnvironments } from \'plaid\';

\@Injectable()

export class PlaidService {

private plaidClient: PlaidApi;

constructor() {

const config = new Configuration({

basePath: PlaidEnvironments\[process.env.PLAID_ENV\],

baseOptions: {

headers: {

\'PLAID-CLIENT-ID\': process.env.PLAID_CLIENT_ID,

\'PLAID-SECRET\': process.env.PLAID_SECRET,

},

},

});

this.plaidClient = new PlaidApi(config);

}

async createLinkToken(userId: string) {

const response = await this.plaidClient.linkTokenCreate({

user: { client_user_id: userId },

client_name: \'Marketeq\',

products: \[\'auth\'\],

country_codes: \[\'US\'\],

language: \'en\',

});

return response.data;

}

async exchangePublicToken(public_token: string) {

const { data } = await this.plaidClient.itemPublicTokenExchange({
public_token });

return data;

}

}



### **🌐 plaid.controller.ts**

****// plaid.controller.ts

import { Controller, Post, Req, Body } from \'@nestjs/common\';

import { PlaidService } from \'./plaid.service\';

\@Controller(\'plaid\')

export class PlaidController {

constructor(private readonly plaidService: PlaidService) {}

\@Post(\'create-link-token\')

async createLinkToken(@Req() req) {

const userId = req.headers\[\'x-user-id\'\]; // Or pull from session
token

return this.plaidService.createLinkToken(userId);

}

\@Post(\'exchange-token\')

async exchangePublicToken(@Body() body) {

const { public_token } = body;

return this.plaidService.exchangePublicToken(public_token);

}

}



### **📤 Response Format**

After /exchange-token, return:

{

\"access_token\": \"access-prod-xxx\",

\"account_id\": \"xxx-account-id\",

\"bank_name\": \"Chase\",

\"account_last4\": \"1234\",

\"account_type\": \"checking\"

}

This payload is sent to checkout-service to attach ACH payment methods.

### **🔒 Security Notes**

- Validate and authenticate all requests (JWT/session middleware).

- Do not return access_token to the frontend.

- Only store tokens and account info in the plaid-service.

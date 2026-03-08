# **📄 02 -- Plaid Integration -- Service Setup & Folder Structure**

### **🧭 Purpose**

This document provides a complete technical setup for the plaid-service
microservice. It outlines how to scaffold the service, install required
dependencies, structure folders, and initialize all critical components.
This setup assumes NestJS, TypeScript, and PostgreSQL with a REST-based
architecture.

### **📁 Folder Structure**

****app/

└── plaid-service/

├── src/

│ ├── plaid/

│ │ ├── plaid.module.ts

│ │ ├── plaid.service.ts

│ │ ├── plaid.controller.ts

│ │ └── plaid.utils.ts

│ ├── dto/

│ │ └── link-token.dto.ts

│ ├── config/

│ │ └── plaid.config.ts

│ ├── main.ts

│ └── app.module.ts

├── .env

├── package.json

└── tsconfig.json



### **⚙️ Setup Instructions**

#### **1. 🔧 Install Dependencies**

Inside plaid-service:

npm install \--save plaid \@nestjs/config \@nestjs/axios



#### **2. 📄 Environment Configuration**

Create a .env file in the root of plaid-service:

PLAID_CLIENT_ID=your_client_id

PLAID_SECRET=your_secret

PLAID_ENV=sandbox



#### **3. 🧩 Plaid Config File**

src/config/plaid.config.ts

export default () =\> ({

clientID: process.env.PLAID_CLIENT_ID,

secret: process.env.PLAID_SECRET,

env: process.env.PLAID_ENV \|\| \'sandbox\',

});



#### **4. 🧠 Plaid Module**

src/plaid/plaid.module.ts

import { Module } from \'@nestjs/common\';

import { PlaidService } from \'./plaid.service\';

import { PlaidController } from \'./plaid.controller\';

\@Module({

providers: \[PlaidService\],

controllers: \[PlaidController\],

})

export class PlaidModule {}



#### **5. 🛠 Plaid Service**

src/plaid/plaid.service.ts

import { Injectable } from \'@nestjs/common\';

import { Configuration, PlaidApi, PlaidEnvironments } from \'plaid\';

\@Injectable()

export class PlaidService {

private client: PlaidApi;

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

this.client = new PlaidApi(config);

}

async createLinkToken(userId: string) {

const response = await this.client.linkTokenCreate({

user: { client_user_id: userId },

client_name: \'Marketeq\',

products: \[\'auth\'\],

country_codes: \[\'US\'\],

language: \'en\',

});

return response.data.link_token;

}

async exchangePublicToken(publicToken: string) {

const response = await this.client.itemPublicTokenExchange({
public_token: publicToken });

return response.data;

}

async createProcessorToken(accessToken: string, accountId: string) {

const response = await this.client.processorTokenCreate({

access_token: accessToken,

account_id: accountId,

processor: \'stripe\',

});

return response.data.processor_token;

}

}



#### **6. 🌐 Plaid Controller**

src/plaid/plaid.controller.ts

import { Controller, Post, Body } from \'@nestjs/common\';

import { PlaidService } from \'./plaid.service\';

\@Controller(\'plaid\')

export class PlaidController {

constructor(private readonly plaidService: PlaidService) {}

\@Post(\'link-token\')

async getLinkToken(@Body(\'userId\') userId: string) {

return { link_token: await this.plaidService.createLinkToken(userId) };

}

\@Post(\'exchange\')

async exchangeToken(@Body(\'publicToken\') publicToken: string) {

return await this.plaidService.exchangePublicToken(publicToken);

}

\@Post(\'stripe/token\')

async getProcessorToken(

\@Body(\'accessToken\') accessToken: string,

\@Body(\'accountId\') accountId: string,

) {

return await this.plaidService.createProcessorToken(accessToken,
accountId);

}

}



#### **7. 🧱 App Bootstrap**

src/app.module.ts

import { Module } from \'@nestjs/common\';

import { ConfigModule } from \'@nestjs/config\';

import { PlaidModule } from \'./plaid/plaid.module\';

\@Module({

imports: \[ConfigModule.forRoot({ isGlobal: true }), PlaidModule\],

})

export class AppModule {}

src/main.ts

import { NestFactory } from \'@nestjs/core\';

import { AppModule } from \'./app.module\';

async function bootstrap() {

const app = await NestFactory.create(AppModule);

await app.listen(3000);

}

bootstrap();



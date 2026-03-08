# **📄 05 -- Secure Storage & Token Reuse for ACH Payments**

### **📌 Purpose**

This document provides the implementation logic to:

- Store Plaid access_token securely

- Store and reuse account_id for future ACH payments

- Enable token reuse across sessions without re-authenticating with
  Plaid Link

### **📁 Folder & File Structure (continued from Document 04)**

****app/

└── plaid-service/

├── src/

│ ├── plaid/

│ │ ├── plaid.controller.ts

│ │ ├── plaid.service.ts

│ │ ├── plaid.module.ts

│ │ ├── plaid.entity.ts ✅ NEW

│ │ └── plaid.repository.ts ✅ NEW



### **🗃️ Database Table: plaid_bank_accounts**

  ---------------------------------------------------------------
  **Column**      **Type**     **Description**
  --------------- ------------ ----------------------------------
  id              UUID         Primary key

  user_id         UUID         Linked to Marketeq user

  access_token    TEXT         Stored encrypted, never exposed to
                               frontend

  account_id      TEXT         Tokenized ID from Plaid

  account_last4   TEXT         Last 4 digits of account number

  account_type    TEXT         Checking / Savings

  bank_name       TEXT         e.g., Chase, Wells Fargo

  created_at      TIMESTAMP    Timestamp of entry

  updated_at      TIMESTAMP    Timestamp of last update
  ---------------------------------------------------------------

### **🧠 plaid.entity.ts**

****// plaid.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
UpdateDateColumn } from \'typeorm\';

\@Entity(\'plaid_bank_accounts\')

export class PlaidBankAccount {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

user_id: string;

\@Column()

access_token: string;

\@Column()

account_id: string;

\@Column()

account_last4: string;

\@Column()

account_type: string;

\@Column()

bank_name: string;

\@CreateDateColumn()

created_at: Date;

\@UpdateDateColumn()

updated_at: Date;

}



### **📚 plaid.repository.ts**

****// plaid.repository.ts

import { EntityRepository, Repository } from \'typeorm\';

import { PlaidBankAccount } from \'./plaid.entity\';

\@EntityRepository(PlaidBankAccount)

export class PlaidRepository extends Repository\<PlaidBankAccount\> {}



### **🔄 Update to plaid.service.ts**

Add the logic for storing tokens when exchanged:

import { InjectRepository } from \'@nestjs/typeorm\';

import { PlaidRepository } from \'./plaid.repository\';

import { PlaidBankAccount } from \'./plaid.entity\';

constructor(

\@InjectRepository(PlaidRepository)

private plaidRepo: PlaidRepository

) {}

async exchangePublicToken(userId: string, public_token: string) {

const { access_token } = (await
this.plaidClient.itemPublicTokenExchange({ public_token })).data;

const { accounts } = (await this.plaidClient.authGet({ access_token
})).data;

const account = accounts\[0\]; // Choose logic to pick appropriate
account

const record = this.plaidRepo.create({

user_id: userId,

access_token,

account_id: account.account_id,

account_last4: account.mask,

account_type: account.subtype,

bank_name: account.name,

});

await this.plaidRepo.save(record);

return {

account_id: account.account_id,

bank_name: account.name,

account_last4: account.mask,

account_type: account.subtype,

};

}



### **🚫 Access Control Notes**

- access_token is never returned to the frontend

- ACH payment flow uses account_id + user_id via secure backend
  service-to-service call to plaid-service

### **🔁 Token Reuse Logic**

When a user initiates a new checkout:

1.  checkout-service calls plaid-service → /get-user-bank-accounts

2.  Plaid responds with available bank accounts linked to user

3.  User selects one → account_id passed to Stripe ACH initiation (no
    re-auth via Plaid Link)

### **🔐 Security Best Practices**

- Encrypt access_token at rest

- Never expose sensitive fields to client

- Always validate user ID on request to prevent token hijack

- If user removes a payment method, immediately revoke the Plaid token

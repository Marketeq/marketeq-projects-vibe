# **📄 06 -- Stripe ACH Integration with Bank Token**

### **📌 Purpose**

This document details how the checkout-service uses the securely stored
account_id (from plaid-service) to create ACH payment sources in Stripe.
This allows one-click ACH payments for returning users without
re-authenticating through Plaid Link.

### **🔁 Overall Flow**

1.  User links bank account via Plaid (handled by plaid-service)

2.  checkout-service fetches saved account_id and access_token

3.  Stripe ACH debit is initiated using the verified bank info

4.  Stripe handles micro-deposit verification (only on first-time setup)

5.  Payment is processed using ACH

### **🧱 Architecture Diagram**

****Frontend UI

│

└── GET /user/saved-bank-accounts → checkout-service

│

└── GET /plaid/accounts → plaid-service

(returns tokenized bank info)

│

└── POST /checkout → checkout-service

│

└── create Stripe ACH source using account_id



### **📁 Folder & File Structure**

****app/

└── checkout-service/

├── src/

│ ├── checkout/

│ │ ├── checkout.controller.ts

│ │ ├── checkout.service.ts

│ │ └── dtos/

│ │ └── initiate-checkout.dto.ts



### **✅ Prerequisites**

- Stripe connected and configured (STRIPE_SECRET_KEY)

- Microservice-to-microservice auth between checkout-service and
  plaid-service

- Stripe Customer ID stored for each user

### **📦 DTO: initiate-checkout.dto.ts**

****export class InitiateCheckoutDto {

userId: string;

planId: string;

plaidBankAccountId: string; // references record from plaid-service

useACH: boolean;

}



### **🔧 checkout.service.ts**

****async initiateACHCheckout(dto: InitiateCheckoutDto) {

const plaidAccount = await this.httpService

.get(\`http://plaid-service/accounts/\${dto.plaidBankAccountId}\`)

.then(res =\> res.data);

const customer = await stripe.customers.create({

email: user.email,

name: user.fullName,

});

const bankAccount = await stripe.customers.createSource(customer.id, {

source: {

object: \'bank_account\',

country: \'US\',

currency: \'usd\',

account_holder_name: user.fullName,

account_holder_type: \'individual\',

routing_number: plaidAccount.routing_number,

account_number: plaidAccount.account_number,

},

});

const paymentIntent = await stripe.paymentIntents.create({

amount: 100000, // \$1,000.00 in cents

currency: \'usd\',

customer: customer.id,

payment_method_types: \[\'us_bank_account\'\],

payment_method_data: {

type: \'us_bank_account\',

us_bank_account: {

account_holder_type: \'individual\',

account_number: plaidAccount.account_number,

routing_number: plaidAccount.routing_number,

},

},

confirm: true,

});

return {

paymentIntentId: paymentIntent.id,

clientSecret: paymentIntent.client_secret,

};

}

> 🔐 You **must** retrieve decrypted account_number and routing_number
> securely from plaid-service. That service holds the encrypted Plaid
> access token and resolves full bank info server-side (never via
> frontend).

### **🔐 Security Rules**

- ACH creation requests only allowed from checkout-service

- Stripe keys must never be exposed to the client

- All sensitive fields stored encrypted in plaid-service

- If verification required, handle via webhook (see future doc on
  micro-deposit verification)

### **🧪 Stripe ACH Testing Instructions**

1.  Use test Plaid credentials:

    - Routing: 110000000

    - Account: 000123456789

2.  Stripe will simulate micro-deposits for first-time bank setups

3.  For re-used accounts, micro-deposit not needed

4.  Webhooks handle status changes (see Document 05 -- Webhook Events)

✅ If you're doing **ACH via Stripe**, then you should **not use Plaid
processor tokens at all anymore.\**
\
Stripe **replaced Plaid with their own product:** [**[Stripe Financial
Connections]{.underline}**](https://stripe.com/docs/financial-connections/ach-debit).

## **🚀 So your new architecture for ACH with Stripe is:**

1.  Use **Stripe Financial Connections** to let the customer securely
    connect their bank account (via Stripe's hosted modal or direct
    API).

2.  Stripe then returns a bank_account object tied to the customer.

3.  You can immediately:

    - Create a **PaymentIntent** to charge them.

    - Or set up a **Subscription** for recurring ACH.

## **🔥 This means:**

- ❌ **No Plaid processor tokens.\**

- ✅ All bank data is directly authorized through **Stripe**, who
  handles microdeposits or instant verification.

## **✅ Short example flow in your backend (NestJS)**

### **1. Client connects bank via Stripe Financial Connections**

On frontend:

const stripe = Stripe(\'pk_live\_\...\');

const session = await
fetch(\'/api/create-financial-connections-session\').then(r =\>
r.json());

await stripe.collectBankAccountForSetup({

clientSecret: session.client_secret,

});



### **2. Your NestJS backend route to create session**

****\@Post(\'create-financial-connections-session\')

async createFinancialConnections() {

const session = await
this.stripeClient.financialConnectionsSessions.create({

account_holder: {

type: \'customer\',

customer: \'cus_12345\', // your Stripe customer ID

},

permissions: \[\'payment_method\'\],

});

return { client_secret: session.client_secret };

}



### **3. Attach returned bank account**

When the user completes linking, Stripe automatically saves a bank
account PaymentMethod.

You can then **create a subscription or PaymentIntent** with:

await this.stripeClient.paymentIntents.create({

amount: 5000,

currency: \'usd\',

customer: \'cus_12345\',

payment_method: \'pm_abc123\', // the bank account payment method ID

off_session: true,

confirm: true,

});



## **🏗️ How this affects your NestJS microservice structure**

✅ You keep using your existing checkout-service to:

- Create the Financial Connections session

- Listen to payment_intent.succeeded webhook events

✅ You **do not need a banking-service for ACH if only using Stripe**.

## **⚙️ Updated folder tree (simplified)**

****apps/

└─ checkout-service/

├─ src/

│ ├─ controllers/

│ │ └─ checkout.controller.ts

│ ├─ services/

│ │ └─ stripe.service.ts

│ ├─ modules/

│ └─ main.ts

├─ package.json

└─ tsconfig.json



✅ That's it.

## **✅ Summary**

  **Feature**                  **Old (Plaid + Stripe)**         **New (Stripe Financial Connections)**
  ---------------------------- -------------------------------- ----------------------------------------
  Account linking              Plaid + processor tokens         Stripe Financial Connections
  Bank account verification    Plaid microdeposits              Stripe instant or microdeposits
  Payments                     ACH via Stripe                   Same, but no Plaid
  Matching or reconciliation   Still handle via your metadata   

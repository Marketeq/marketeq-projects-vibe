# **📄 Stripe ACH Mandate Setup & Processing**

## **🚀 Purpose**

This document explains how to fully integrate Stripe's **ACH Direct
Debit via Financial Connections**, ensuring that:

✅ Mandates are created during the front-end flow (Stripe.js
auto-captures authorization)\
✅ You can process us_bank_account payments immediately with no "missing
mandate" errors\
✅ All metadata is tracked for your project / contract logic

## **📂 Folder structure**

****apps/

└─ checkout-service/

├─ src/

│ ├─ controllers/

│ │ └─ checkout.controller.ts

│ ├─ services/

│ │ └─ stripe.service.ts

├─ .env

└─ tsconfig.json



# **✅ 1. Stripe backend service**

**apps/checkout-service/src/services/stripe.service.ts**

****import { Injectable } from \'@nestjs/common\';

import Stripe from \'stripe\';

\@Injectable()

export class StripeService {

private stripe: Stripe;

constructor() {

this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {

apiVersion: \'2023-08-16\',

});

}

async createFinancialConnectionsSession(customerId: string) {

return this.stripe.financialConnections.sessions.create({

account_holder: {

type: \'customer\',

customer: customerId,

},

permissions: \[\'payment_method\'\],

});

}

async retrieveSetupIntent(setupIntentId: string) {

return this.stripe.setupIntents.retrieve(setupIntentId);

}

async createACHPaymentIntent({

customerId,

paymentMethodId,

amount,

metadata

}: {

customerId: string,

paymentMethodId: string,

amount: number,

metadata: Record\<string, string\>

}) {

return this.stripe.paymentIntents.create({

amount,

currency: \'usd\',

customer: customerId,

payment_method: paymentMethodId,

payment_method_types: \[\'us_bank_account\'\],

off_session: true,

confirm: true,

metadata

});

}

}



# **✅ 2. Controller endpoints**

**apps/checkout-service/src/controllers/checkout.controller.ts**

****import { Controller, Post, Body } from \'@nestjs/common\';

import { StripeService } from \'../services/stripe.service\';

\@Controller(\'checkout\')

export class CheckoutController {

constructor(private readonly stripeService: StripeService) {}

\@Post(\'create-bank-link-session\')

async createBankLink(@Body() body: { customerId: string }) {

const session = await
this.stripeService.createFinancialConnectionsSession(body.customerId);

return { clientSecret: session.client_secret };

}

\@Post(\'confirm-bank-mandate\')

async confirmMandate(@Body() body: { setupIntentId: string }) {

const setupIntent = await
this.stripeService.retrieveSetupIntent(body.setupIntentId);

return { paymentMethodId: setupIntent.payment_method };

}

\@Post(\'pay-ach\')

async payACH(@Body() body: {

customerId: string,

paymentMethodId: string,

amount: number,

metadata: Record\<string, string\>

}) {

return this.stripeService.createACHPaymentIntent(body);

}

}



# **✅ 3. Frontend integration (Stripe.js)**

✅ Use stripe.collectBankAccountForPayment, which will:

- Open the Stripe bank modal

- Collect routing + account number

- Display the ACH mandate checkbox

- Capture customer's IP, name, consent (required by Nacha rules)

- Create a SetupIntent with a linked us_bank_account + mandate

import { loadStripe } from \'@stripe/stripe-js\';

const stripe = await loadStripe(\'pk_live\_\...\');

async function linkBankAndCreateMandate() {

const res = await fetch(\'/checkout/create-bank-link-session\', {

method: \'POST\',

headers: { \'Content-Type\': \'application/json\' },

body: JSON.stringify({ customerId: \'cus_12345\' })

});

const { clientSecret } = await res.json();

const { setupIntent, error } = await
stripe.collectBankAccountForPayment({

clientSecret,

paymentMethodType: \'us_bank_account\',

});

if (error) {

console.error(\'Error:\', error.message);

return;

}

// This setupIntent now includes the mandate. Pass it to your backend:

await fetch(\'/checkout/confirm-bank-mandate\', {

method: \'POST\',

headers: { \'Content-Type\': \'application/json\' },

body: JSON.stringify({ setupIntentId: setupIntent.id }),

}).then(async res =\> {

const { paymentMethodId } = await res.json();

console.log(\'Bank linked with mandate. PaymentMethod ID:\',
paymentMethodId);

// Now you can initiate the ACH charge

await fetch(\'/checkout/pay-ach\', {

method: \'POST\',

headers: { \'Content-Type\': \'application/json\' },

body: JSON.stringify({

customerId: \'cus_12345\',

paymentMethodId,

amount: 50000, // \$500.00

metadata: {

project_id: \'proj_456\',

contract_id: \'ctr_789\'

}

}),

});

});

}



# **✅ 4. Security guarantees & mandate compliance**

✅ Stripe does all mandate compliance:

- Captures IP, time, user authorization

- Generates a mandate ID tied to the us_bank_account

- Handles Nacha returns & banking fraud disputes

✅ Your metadata (project_id, contract_id) stays linked in the
PaymentIntent.

# **✅ 💥 Summary of the final flow**

✅ **Create Financial Connections session\**
✅ **Use collectBankAccountForPayment** to generate the SetupIntent +
mandate\
✅ **Retrieve the PaymentMethod on your backend\**
✅ **Create PaymentIntent and confirm immediately with mandate
attached\**
✅ **Webhook (payment_intent.succeeded) then triggers project or
contract verification**

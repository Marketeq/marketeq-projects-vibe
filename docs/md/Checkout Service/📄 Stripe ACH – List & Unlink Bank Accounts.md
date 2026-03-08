# **📄 Stripe ACH -- List & Unlink Bank Accounts**

## **🚀 Purpose**

This document describes how your platform allows customers to:

✅ View all their linked bank accounts (retrieved from Stripe).\
✅ Remove (unlink) a bank account (detach a PaymentMethod from Stripe
Customer).

This is important for PCI compliance and for users switching accounts.

## **📂 Folder structure**

****apps/

└─ checkout-service/

├─ src/

│ ├─ controllers/

│ │ └─ banks.controller.ts

│ ├─ services/

│ │ └─ stripe.service.ts

└─ tsconfig.json



# **✅ 1. Stripe service implementation**

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

async listCustomerBankAccounts(customerId: string) {

return this.stripe.paymentMethods.list({

customer: customerId,

type: \'us_bank_account\',

});

}

async unlinkBankAccount(paymentMethodId: string) {

return this.stripe.paymentMethods.detach(paymentMethodId);

}

}



# **✅ 2. Controller routes**

**apps/checkout-service/src/controllers/banks.controller.ts**

****import { Controller, Get, Post, Param, Body } from
\'@nestjs/common\';

import { StripeService } from \'../services/stripe.service\';

\@Controller(\'banks\')

export class BanksController {

constructor(private readonly stripeService: StripeService) {}

\@Get(\':customerId\')

async listBanks(@Param(\'customerId\') customerId: string) {

const methods = await
this.stripeService.listCustomerBankAccounts(customerId);

return methods.data.map(pm =\> ({

id: pm.id,

bankName: pm.us_bank_account?.bank_name,

last4: pm.us_bank_account?.last4,

fingerprint: pm.us_bank_account?.fingerprint,

created: pm.created,

}));

}

\@Post(\'unlink\')

async unlinkBank(@Body() body: { paymentMethodId: string }) {

const detached = await
this.stripeService.unlinkBankAccount(body.paymentMethodId);

return { detached: detached.id };

}

}



# **✅ 3. Example frontend fetch calls**

### **🔍 List linked banks**

****const res = await fetch(\`/banks/\${customerId}\`);

const banks = await res.json();

console.log(\'Linked bank accounts:\', banks);



### **🗑 Unlink bank**

****await fetch(\'/banks/unlink\', {

method: \'POST\',

headers: { \'Content-Type\': \'application/json\' },

body: JSON.stringify({ paymentMethodId: \'pm_abc123\' })

});



# **✅ 4. Security considerations**

✅ You never store sensitive routing or account numbers.\
✅ Stripe handles full PCI scope.\
✅ last4 + bank_name is enough for billing screens.

# **✅ 🎯 Complete summary of flow**

✅ **List:**

- Calls Stripe's paymentMethods.list({ type: \'us_bank_account\' })

- Returns IDs, last4, bank name for your UI.

✅ **Unlink:**

- Calls paymentMethods.detach(paymentMethodId).

- Stripe will no longer allow charges on that account.

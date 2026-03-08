## **🚀 1️⃣ Postman Testing Collection for Stripe ACH flow**

### **💾 Postman endpoints to create**

  **Name**                     **Method**   **URL**                                                   **Body**
  ---------------------------- ------------ --------------------------------------------------------- ------------------------------------------------------------------------------------------
  Create Bank Link Session     POST         http://localhost:3000/checkout/create-bank-link-session   { \"customerId\": \"cus_12345\" }
  Trigger Payment (ACH)        POST         http://localhost:3000/checkout/pay-ach                    { \"customerId\": \"cus_12345\", \"paymentMethodId\": \"pm_abc123\", \"amount\": 50000 }
  Webhook Test (manual post)   POST         http://localhost:3000/webhook/stripe                      Raw JSON Stripe event payload

### **✅ Testing steps in order**

1.  **Create Bank Link Session\**

    - POST to /checkout/create-bank-link-session

    - Response: { \"clientSecret\": \"seti\_\...\" }

    - Use this on your frontend (Stripe.js) or manually confirm on
      Stripe Dashboard under *Financial Connections Sessions*.

2.  **Attach Payment Method & Create PaymentIntent\**

    - POST to /checkout/pay-ach (if you have this built, else do it in
      Stripe Dashboard to simulate).

    - Body:

{

\"customerId\": \"cus_12345\",

\"paymentMethodId\": \"pm_abc123\",

\"amount\": 50000

}

- Should return:

{ \"paymentIntentId\": \"pi\_\...\" }

3.  **Trigger webhook\**

    - Use stripe trigger payment_intent.succeeded or manually POST to
      /webhook/stripe with Stripe sample event JSON.

    - Ensure your logs show: ✅ Payment received: pi\_\...

### **🔥 Sample raw JSON for webhook**

Use in Postman Body → raw → JSON:

{

\"id\": \"evt_test_webhook\",

\"type\": \"payment_intent.succeeded\",

\"data\": {

\"object\": {

\"id\": \"pi_test123\",

\"amount\": 50000,

\"metadata\": {

\"project_id\": \"proj_456\",

\"contract_id\": \"ctr_789\"

}

}

}

}



✅ **Done for Postman.**

## **⏰ 2️⃣ Cron Job Fallback to sync unpaid invoices**

### **✅ Purpose**

Ensure any missed webhook (or edge case payment delays) still get
processed.\
Best practice is **15-30 min** intervals.

### **📂 Example cron setup**

****// apps/checkout-service/src/services/cron.service.ts

import { Injectable } from \'@nestjs/common\';

import { Cron, CronExpression } from \'@nestjs/schedule\';

import Stripe from \'stripe\';

\@Injectable()

export class CronService {

private stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {

apiVersion: \'2023-08-16\',

});

\@Cron(CronExpression.EVERY_15_MINUTES)

async checkUnpaidInvoices() {

console.log(\'Running fallback unpaid invoice checker\...\');

const invoices = await this.stripe.invoices.list({

status: \'open\',

});

for (const invoice of invoices.data) {

console.log(\`Invoice \${invoice.id} still open for
\${invoice.customer}\`);

// You can retry payments or send alerts here

// e.g. this.notificationService.sendPaymentReminder(\...)

}

}

}



### **🔐 Logging & alerting**

- Log all attempts to your centralized system.

- Only notify the AR team if the invoice is \>24h old (or config
  threshold).

- Optionally sync into Airtable or your DB table:\
  invoices_retry_log

# **📄 Stripe ACH -- Failed Payment Retry Logic & AR Notifications**

## **🧭 Purpose**

This document defines how the system automatically handles **failed ACH
payments**, based on:

- Industry best practices for retry attempts

- Stripe's built-in retry settings

- Platform-level retry and escalation flow

- Email/Slack notifications to AR team

- Grace periods and project pause logic

## **✅ Key Goals**

- Automatically retry failed ACH payments up to 3 times

- Apply cooldown after repeated failures

- Pause project/contract only after all retries are exhausted

- Notify AR team and client on each failure

- Final fallback: mark as \"Payment Overdue\" and queue for manual
  collections

## **⚙️ Stripe Subscription Retry Settings**

Stripe **supports automatic retry settings** per subscription:

await stripeClient.subscriptionSchedules.create({

customer: customerId,

start_date: \'now\',

end_behavior: \'release\',

phases: \[

{

items: \[{ price: \'price_abc\', quantity: 1 }\],

iterations: 1,

default_payment_method: paymentMethodId,

},

\],

payment_settings: {

payment_method_options: {

us_bank_account: {

verification_method: \'automatic\',

},

},

save_default_payment_method: \'on_subscription\',

},

metadata: {

contract_id: contractId,

project_id: projectId,

},

});

Set these in Stripe Dashboard under:\
**Settings → Subscriptions and emails → Manage failed payments**

✅ Recommended config:

- Retry: **3 times over 7 days\**

- Final state: **Cancel subscription and notify backend\**

## **🧠 Platform-Level Retry Fallback (for added control)**

Stripe retry is good, but to **trigger project/contract pauses**, we
implement backend logic too.

## **🛠️ Cron-based Retry Service**

**File:** apps/checkout-service/src/services/payment-retry.service.ts

import { Injectable } from \'@nestjs/common\';

import { Cron } from \'@nestjs/schedule\';

import Stripe from \'stripe\';

\@Injectable()

export class PaymentRetryService {

private stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {

apiVersion: \'2023-08-16\',

});

\@Cron(\'0 \* \* \* \*\') // every hour

async checkFailedInvoices() {

const failed = await this.stripe.invoices.list({

status: \'open\',

collection_method: \'charge_automatically\',

});

for (const invoice of failed.data) {

if (invoice.attempted && invoice.paid === false) {

const metadata = invoice.metadata;

const retryCount = Number(metadata.retry_count \|\| 0);

if (retryCount \>= 3) {

// Max retries exceeded -- pause project

await this.pauseLinkedContract(metadata.contract_id);

await this.notifyAR(metadata, \'max_retry_exceeded\');

} else {

// Retry manually (if Stripe didn't)

await this.retryInvoice(invoice.id);

await this.updateRetryCount(invoice.id, retryCount + 1);

}

}

}

}

async retryInvoice(invoiceId: string) {

await this.stripe.invoices.retry(invoiceId);

}

async updateRetryCount(invoiceId: string, count: number) {

await this.stripe.invoices.update(invoiceId, {

metadata: { retry_count: String(count) },

});

}

async pauseLinkedContract(contractId: string) {

// Call contract service or DB to pause

}

async notifyAR(meta: any, reason: string) {

// Send Slack/email alert

console.log(\`🔔 Alert: Payment failed for \${meta.project_id}
(\${reason})\`);

}

}



## **📤 Notifications (AR + Client)**

### **On each failed attempt:**

- Notify **AR team** via email/Slack:

  - \"ACH Payment Failed -- Contract #123 / Project X -- Retry #2 of 3\"

- Notify **Client**:

  - \"We were unable to collect your payment. Retry attempt #2 of 3 will
    occur automatically.\"

## **⏱ Grace Period**

- Projects/Contracts are not paused **until all retries fail\**

- After 3rd failure → status: payment_overdue

- Pause project, revoke "Payment Verified" badge

## **✅ Summary**

  -------------------------------------------------------------
  **Event**           **Action**
  ------------------- -----------------------------------------
  Payment fails once  Retry automatically (via Stripe or
                      manually)

  Payment fails 3     Pause contract, notify AR, send client
  times               escalation email

  Payment later       Restore Payment Verified badge, resume
  succeeds            contract

  Payment remains     AR manually escalates (separate
  unpaid              collections sprint)
  -------------------------------------------------------------

## **✅ Security**

- Retry count stored in Stripe metadata

- Contract/project pause happens via backend auth-locked API

- All retries are logged to centralized log system

# **📄 07 -- Webhook Events for ACH & Bank Statuses**

### **📌 Purpose**

This document defines the Stripe webhook events the checkout-service
must listen for in order to handle payment verification, account
validation (e.g., micro-deposit verification), and bank failures during
ACH transactions.

### **📡 Required Stripe Webhooks**

  -------------------------------------------------------------------------
  **Event**                        **Purpose**
  -------------------------------- ----------------------------------------
  payment_intent.succeeded         ACH payment succeeded -- mark checkout
                                   as paid

  payment_intent.payment_failed    ACH payment failed -- trigger retry or
                                   badge removal

  customer.bank_account.verified   Bank micro-deposit verification passed

  customer.bank_account.updated    Bank info changed -- revalidate or
                                   invalidate cache

  customer.bank_account.deleted    Bank info deleted -- flag checkout flow
  -------------------------------------------------------------------------

### **📦 Webhook Endpoint**

Create a secure endpoint in the checkout-service:

POST /stripe/webhook

### **🔐 Signature Verification**

Use Stripe's stripe.webhooks.constructEvent() to verify authenticity:

const sig = req.headers\[\'stripe-signature\'\];

const event = stripe.webhooks.constructEvent(

req.body,

sig,

process.env.STRIPE_WEBHOOK_SECRET

);



### **⚙️ Event Handling Example**

****switch (event.type) {

case \'payment_intent.succeeded\':

const paymentIntent = event.data.object;

await this.checkoutService.markPaymentAsComplete(paymentIntent.id);

break;

case \'payment_intent.payment_failed\':

const failedIntent = event.data.object;

await this.checkoutService.handleFailedACH(failedIntent.id);

break;

case \'customer.bank_account.verified\':

const verifiedAccount = event.data.object;

await
this.checkoutService.updateBankVerificationStatus(verifiedAccount.id,
true);

break;

case \'customer.bank_account.deleted\':

await this.checkoutService.disableBankCheckout(failedIntent.customer);

break;

default:

console.log(\`Unhandled event type: \${event.type}\`);

}



### **🧠 Notes on Micro-Deposit Verification**

- Stripe automatically triggers the customer.bank_account.verified
  webhook once the user completes the verification step (entering two
  micro-deposit amounts).

- No client-side polling is needed.

- After receiving this event:

  - Mark bank account as verified in your DB

  - Allow the user to check out using ACH with no further Plaid
    re-authentication

### **🔄 Retry Logic for payment_intent.payment_failed**

When this event is received:

- Revoke any **Payment Verified** badges

- Optionally add a **cooldown** period before retry is allowed (see
  Document 10)

- Log failure to payment_failure_log table

- If recurring payment: mark subscription as paused until retry

### **🔐 Security Enforcement**

- Only allow webhook traffic from Stripe IPs or use signed webhook
  secrets

- Never trust client-triggered status changes

- Log all webhook activity with event.id, timestamp, and Stripe
  signature

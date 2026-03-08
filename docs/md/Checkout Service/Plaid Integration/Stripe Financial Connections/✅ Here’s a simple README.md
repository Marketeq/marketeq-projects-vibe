✅ Here's a **simple README.md** you can drop directly into your
checkout-service directory.\
\
It includes **exact developer setup, Postman usage, and fallback cron
explanation** --- all in one place.

# **🧾 Marketeq -- Checkout Service**

This service handles all client payments via Stripe (ACH, credit, etc).\
It also triggers project + contract verification after successful
payment.

## **🚀 Getting Started**

### **🖥 Environment Setup**

- Copy .env.example → .env

- Fill in:

STRIPE_SECRET_KEY=sk_live\_\...

STRIPE_WEBHOOK_SECRET=whsec\_\...

DATABASE_URL=postgres://\...

- Install deps:

yarn install

- Run migrations:

yarn typeorm migration:run

- Start dev server:

yarn start:dev



### **🔄 Fallback Cron**

- Every **15 min**, checks for unpaid invoices in Stripe.

- Logs open invoices. Can be extended to retry or alert.

No config needed. Already enabled via:

@Cron(CronExpression.EVERY_15_MINUTES)



## **💳 Postman Testing**

### **🚀 Simulate full ACH flow**

1.  **Create bank session\**

****POST /checkout/create-bank-link-session

Body: { \"customerId\": \"cus\_\...\" }

2.  **Create payment intent\**

****POST /checkout/pay-ach

Body: { \"customerId\": \"cus\_\...\", \"paymentMethodId\":
\"pm\_\...\", \"amount\": 50000 }

3.  **Trigger webhook\**

    - Use Stripe CLI:

stripe trigger payment_intent.succeeded

- Or manually:

POST /webhook/stripe

Raw JSON Stripe event



## **✅ Invoice Source of Truth**

- All invoices for ACH & credit live in **Stripe**.

- Your custom billing UI will fetch from your DB, which syncs from
  Stripe.

Wire transfers are separate and tracked by the AR workflow (Mercury →
QuickBooks → Platform).

## **📝 Logging**

- Successful syncs & fallback checks logged to console + DB.

- Errors trigger notification to the AR team (via email / Slack based on
  config).
